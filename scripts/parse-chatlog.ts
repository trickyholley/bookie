/**
 * Renders a Claude Code session JSONL log (e.g. `chatlog.jsonl`) as a
 * human-readable Markdown transcript.
 *
 * Usage: tsx scripts/parse-chatlog.ts [input.jsonl] [output.md]
 * Defaults: chatlog.jsonl -> CHATLOG.md (relative to cwd)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
}

interface RawEntry {
  type: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: string | ContentBlock[];
  };
}

type Segment =
  | { kind: "text"; value: string }
  | { kind: "tools"; calls: string[] };

interface AssistantTurn {
  timestamp?: string;
  segments: Segment[];
}

// The one-or-two fields (per tool) that best summarize a call, shown bare
// (no JSON quoting). Anything not listed here falls back to the raw
// JSON.stringify'd input.
const ARG_FIELD: Record<string, string> = {
  Bash: "command",
  Read: "file_path",
  Write: "file_path",
  Edit: "file_path",
  NotebookEdit: "notebook_path",
  TaskCreate: "description",
  ToolSearch: "query",
  Grep: "pattern",
  Glob: "pattern",
  WebFetch: "url",
  WebSearch: "query",
};

const MAX_ARG_LEN = 160;

function truncate(s: string, max = MAX_ARG_LEN): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function formatToolCall(name: string, input: unknown): string {
  const field = ARG_FIELD[name];
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : undefined;
  const raw = field && typeof record?.[field] === "string" ? (record[field] as string) : JSON.stringify(input);
  return `${name}(${truncate(raw)})`;
}

function fmtTs(iso: string | undefined): string {
  if (!iso) return "unknown time";
  return iso.replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

// "Your questions have been answered: "Q1"="A1", "Q2"="A2". You can now continue..."
function parseAnsweredQuestions(content: unknown): [string, string][] | null {
  if (typeof content !== "string") return null;
  const m = content.match(/^Your questions have been answered: (.+)\. You can now continue/s);
  if (!m) return null;
  const pairs: [string, string][] = [];
  const re = /"((?:[^"\\]|\\.)*)"="((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(m[1])) !== null) {
    pairs.push([match[1].replace(/\\"/g, '"'), match[2].replace(/\\"/g, '"')]);
  }
  return pairs.length ? pairs : null;
}W

function renderSegments(segments: Segment[]): string {
  return segments
    .map((seg) =>
      seg.kind === "text"
        ? seg.value
        : `<details><summary>Tool calls (${seg.calls.length})</summary>\n\n${seg.calls
            .map((c) => `- 🔧 ${c}`)
            .join("\n")}\n\n</details>`,
    )
    .join("\n\n");
}

function parseChatlog(inputPath: string): string[] {
  const lines = readFileSync(inputPath, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  const output: string[] = [];
  const toolNameById = new Map<string, string>();
  let currentAssistant: AssistantTurn | null = null;

  function flushAssistant() {
    if (!currentAssistant) return;
    const body = renderSegments(currentAssistant.segments);
    if (body.trim()) {
      output.push(`### ${fmtTs(currentAssistant.timestamp)} — Claude\n\n${body}`);
    }
    currentAssistant = null;
  }

  function pushSimpleTurn(timestamp: string | undefined, who: string, body: string) {
    flushAssistant();
    output.push(`### ${fmtTs(timestamp)} — ${who}\n\n${body}`);
  }

  function handleUserString(entry: RawEntry, content: string) {
    const cmdMatch = content.match(
      /^<command-name>([^<]*)<\/command-name>\s*<command-message>([^<]*)<\/command-message>\s*<command-args>([\s\S]*)<\/command-args>\s*$/,
    );
    if (cmdMatch) {
      const name = cmdMatch[1].trim();
      const args = cmdMatch[3].trim();
      pushSimpleTurn(entry.timestamp, "Me (slash command)", args ? `**${name}** ${args}` : `**${name}**`);
      return;
    }
    if (/^<local-command-stdout>/.test(content) || /^<local-command-caveat>/.test(content)) {
      // Claude Code's own bookkeeping echoes, not something the user said.
      return;
    }
    if (content.startsWith("This session is being continued from a previous conversation")) {
      flushAssistant();
      output.push(
        `> _${fmtTs(entry.timestamp)} — context window compacted here (Claude Code's \`/compact\`); the ` +
          "pre-compaction context was summarized internally and fed back in to continue the session. The " +
          "summary itself is omitted here but present verbatim in the raw JSONL._",
      );
      return;
    }
    const text = content.trim();
    if (!text) return;
    pushSimpleTurn(entry.timestamp, "Me", text);
  }

  function handleUserBlocks(entry: RawEntry, blocks: ContentBlock[]) {
    for (const block of blocks) {
      if (block.type === "text") {
        const text = (block.text ?? "").trim();
        if (!text) continue;
        if (/^\[Request interrupted[^\]]*\]$/.test(text)) {
          flushAssistant();
          output.push(`*${fmtTs(entry.timestamp)} — ${text}*`);
        } else {
          pushSimpleTurn(entry.timestamp, "Me", text);
        }
      } else if (block.type === "tool_result") {
        const toolName = block.tool_use_id ? toolNameById.get(block.tool_use_id) : undefined;
        if (toolName === "AskUserQuestion") {
          const pairs = parseAnsweredQuestions(block.content);
          if (pairs) {
            const body = pairs.map(([q, a]) => `- **${q}**\n  → ${a}`).join("\n\n");
            pushSimpleTurn(entry.timestamp, "Me (answered a clarifying question)", body);
          }
        }
        // Other tool results are omitted here (they're implied by the tool-call
        // marker above); see the raw JSONL for full output.
      }
    }
  }

  function handleAssistantBlocks(entry: RawEntry) {
    const content = entry.message?.content;
    if (!Array.isArray(content)) return;
    if (!currentAssistant) {
      currentAssistant = { timestamp: entry.timestamp, segments: [] };
    }
    for (const block of content) {
      if (block.type === "text") {
        const text = (block.text ?? "").trim();
        if (!text) continue;
        currentAssistant.segments.push({ kind: "text", value: text });
      } else if (block.type === "tool_use" && block.name) {
        if (block.id) toolNameById.set(block.id, block.name);
        const rendered = formatToolCall(block.name, block.input);
        const last = currentAssistant.segments[currentAssistant.segments.length - 1];
        if (last?.kind === "tools") {
          last.calls.push(rendered);
        } else {
          currentAssistant.segments.push({ kind: "tools", calls: [rendered] });
        }
      }
      // "thinking" blocks are intentionally omitted for readability.
    }
  }

  for (const line of lines) {
    let entry: RawEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type === "user") {
      const content = entry.message?.content;
      if (typeof content === "string") handleUserString(entry, content);
      else if (Array.isArray(content)) handleUserBlocks(entry, content);
    } else if (entry.type === "assistant") {
      handleAssistantBlocks(entry);
    }
    // Everything else (mode, permission-mode, file-history-snapshot, attachment,
    // last-prompt, system, ai-title, ...) is session bookkeeping, not conversation.
  }
  flushAssistant();

  return output;
}

function main() {
  const [, , inArg, outArg] = process.argv;
  const inputPath = resolve(process.cwd(), inArg ?? "chatlog.jsonl");
  const outputPath = resolve(process.cwd(), outArg ?? "CHATLOG.md");

  const turns = parseChatlog(inputPath);

  const intro = [
    "# Chat Transcript",
    "",
    `Mechanically generated, chronological rendering of the raw Claude Code session log ` +
      `(\`${basename(inputPath)}\`), produced by \`scripts/parse-chatlog.ts\`. Every prompt, slash ` +
      "command, clarifying-question answer, and visible assistant response is reproduced in original " +
      "order and verbatim, with real timestamps.",
    "",
    `Internal assistant "thinking" blocks and full tool-call arguments are omitted for readability — ` +
      "each tool call is shown as a one-line marker with its most relevant argument, truncated to " +
      `${MAX_ARG_LEN} characters. Nothing here is reworded or summarized by an AI; for full, byte-for-byte ` +
      `fidelity see the raw \`${basename(inputPath)}\`.`,
    "",
    "---",
  ].join("\n");

  const doc = `${[intro, ...turns].join("\n\n\n")}\n`;
  writeFileSync(outputPath, doc, "utf8");
  console.log(`Wrote ${turns.length} turns to ${outputPath}`);
}

main();