import type { SetURLSearchParams } from "react-router";

// Multiple components (UserContext for `user`, BrowsePage for `q`/`genre`/
// `page`) each hold their own useSearchParams() snapshot and may update the
// URL within the same render pass. react-router hands the update function
// its own (possibly stale) snapshot as `prev`, so two concurrent updates in
// the same tick can clobber each other. Reading window.location.search fresh
// instead sidesteps that: by the time this runs, any earlier synchronous
// update in the same tick has already landed in the browser's URL.
export function setUrlParam(setSearchParams: SetURLSearchParams, key: string, value: string | null): void {
  setSearchParams(() => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    return next;
  }, { replace: true });
}

export function setUrlParams(setSearchParams: SetURLSearchParams, updates: Record<string, string | null>): void {
  setSearchParams(() => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return next;
  }, { replace: true });
}
