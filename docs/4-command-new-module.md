---
description: Scaffold a new Command Center module end-to-end
---

Create a new Command Center module from scratch.

First, ask the user:
- Module name (e.g. "Calendar", "Memories")
- One-sentence description of what it does

Then execute the following steps in order using the TodoWrite tool to track progress. Mark each step complete before moving to the next.

**Step 1 — Schema**
Add a table to `db/schema.ts` following existing table patterns (see memories, projects, etc.).
Export inferred types at the bottom of the file.

**Step 2 — Migrate**
Run: `npx drizzle-kit generate && npx drizzle-kit migrate`

**Step 3 — API routes**
Create `app/api/[module]/route.ts` (GET list + POST create).
Create `app/api/[module]/[id]/route.ts` (PATCH + DELETE) if the module has individual records.

**Step 4 — Server page**
Create `app/[module]/page.tsx`:
- Add `export const dynamic = "force-dynamic"` at the top
- Query the DB using the singleton from `lib/db.ts`
- Pass initialData to the client component as props

**Step 5 — Client component**
Create `app/components/[Module]Landing.tsx`:
- `"use client"` at the top
- Accept initialData as props, store in useState
- All mutations call fetch() to API routes and update local state with the response

**Step 6 — Enable in sidebar**
Add an entry to the `modules` array in `app/components/Sidebar.tsx` with `active: true`.

**Step 7 — Update CLAUDE.md**
- Add the new module to the "Active Modules" section in `CLAUDE.md`
- Add any new settings keys to the "Settings System" section if applicable
- Add any new lib/ utilities to the documentation

**Step 8 — Update project tasks**
In the "Command Center" project (`/projects/1`), add:
- Done items for each step just completed (tags: [module-name])
- Todo items for any known follow-up work (tags: [module-name])
- Idea items for future enhancements discovered during planning (tags: [module-name])

**Step 9 — Update this command**
If any step required doing something not covered above — a convention that diverged, an extra file that was needed, a gotcha hit during migration or API wiring — add it to the relevant step so the next module benefits. Keep additions concrete and minimal.

**Step 10 — Smoke check (optional)**
If the server is running, run `/smoke-check` to verify the new module's API routes and page respond correctly before closing out.
