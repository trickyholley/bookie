# Bookie

A minimal web-based bookstore built for the Senior Node/React Engineering Assignment: browse a catalog of books, filter/search, leave a 1–5 star rating, add to cart, and check out — plus a small reporting view. Built AI-assisted with Claude Code; the full interaction log is in [`CHATLOG.md`](./CHATLOG.md) (and, unedited, in [`chatlog.jsonl`](./chatlog.jsonl) — see the note at the top of `CHATLOG.md` for why both exist).

**Stack:** Node.js, Apollo Server (GraphQL), Prisma + Postgres on the backend; Vite, React 19, Apollo Client, Tailwind + shadcn/ui, react-router on the frontend. Vitest + Testing Library for tests in both workspaces.

<img width="3732" height="1873" alt="image" src="https://github.com/user-attachments/assets/d3901ce0-ee41-4fea-a520-ae9e3c5cdc5b" />

---

## Setup Instructions

### Prerequisites
- Node.js 22+
- Docker
  - **Mac:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) — works out of the box
  - **Linux:** ensure `docker` runs without `sudo` (see the
    [post-install guide](https://docs.docker.com/engine/install/linux-postinstall/))


```bash
# 1. Install dependencies for all three workspaces (frontend, backend, shared)
npm install

# 2. Start Postgres (docker-compose.yml maps it to localhost:5433, so it
#    won't collide with a Postgres instance you may already have running)
npm run db:up

# 3. Copy the env template and run the initial migration
cp backend/.env.example backend/.env
npm run db:migrate

# 4. Seed the database (see "Seed data" below for what this generates)
npm run db:seed

# 5. Run both the Apollo server (http://localhost:4000) and the Vite dev
#    server (http://localhost:5173) together
npm run dev
```

Other useful root-level scripts:

```bash
npm test           # Vitest in both backend and frontend
npm run build      # production build of both workspaces
npm run db:down    # stop Postgres
```

### Seed data

`backend/prisma/seed.ts` generates data at the assignment's full target scale, not a scaled-down dev sample — this was cheap enough (a handful of chunked `createMany` calls, single-digit seconds end to end) that there was no reason to seed less:

| Publishers | Authors | Genres | Books | Users | Reviews | Orders |
|---|---|---|---|---|---|---|
| 100 | 10,000 | 15 | 10,000 | 1,000 | 5,000 | 1,500 |

`faker`-seeded with a fixed seed for reproducible runs.

---

## Architectural Decisions

- I used the basic tech stack as described in the assignment.
- I went with `shadcn` components to have workable UI quickly.
- I made `/frontend`, `/backend` and `/shared` directories, with shared acting as the API source of truth.
- I largely was okay with what Claude decided as far as the data models go. Perhaps on a longer-term project I would be more opinionated, but for the basics there were no major changes other than an object name (`BookListPage`).

---

## AI Output I Intentionally Changed

- BookListPage name I mentioned earlier.
- I disliked that user reviews couldn't be updated, something Claude assumed; altered that.
- There were a few bugs that popped up I needed to fix, such as database IDs showing in closed dropdowns and oddities with the user `Load More`.
- I felt the book fetching was jarring UX, so I had Claude clean it up a bit after their implementation.
---

## Two Additional Features I Chose
1. I added search params to make URLs shareable.
2. Arguably, I made reviews updatable, rendering separately. Could argue that was part of the spec.
3. I made sure the mobile layout was usable.
---

## Assumptions & Tradeoffs Due to Timebox
- There were a couple bugs or missing features left
- - I would've liked to add a `Clear cart` button
- - Attempting to check out with no user results in a vague API error; would've liked to either enforce a user ot provide a more helpful response
- I didn't vet the AI output quite as carefully as I normally would to ensure I completed what I wanted; given more time, I would've found ways to debloat the generated code
---

## Reflection: AI Usage

**What did AI significantly accelerate?** Basically all major code output; what took Claude 3 hours with guidance would have taken me probably a couple days by hand. It also likely caught edge cases I would not have considered.

**Where did AI make things worse, or at least not better?** It had a few moments of faulty UI implementation due to not actually seeing the website. It does not truly understand the user experience like a human would (though programmers are notoriously bad at this too ;D). I also suspect it was more verbose than needed, which as mentioned earlier I would've corrected in a proper prod-facing application.

**What risks does AI introduce into engineering workflows?** The AI cannot be trusted beyond the engineer's capabilities, or else the engineer will fail to see what the AI is doing and any associated implications. I feel I can competently guide Claude as I know how to build applications and therefore can catch errors; it would be irresponsible for me to utilize Claude to do stuff I have no clue about. For instance, DB work and financial transactions especially are 2 areas someone would **need** to know before they can just throw Claude at it, or we can face legitimate problems.
