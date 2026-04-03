---
description: Scaffold a new Command Center module end-to-end
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite
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
- Import `revalidatePath` from `next/cache` in every route file that has write handlers
- Call `revalidatePath("/[module]")` in every POST, PATCH, and DELETE handler, immediately before the final `return`
- Do NOT add it to GET handlers

**Step 4 — Server page**
Create `app/[module]/page.tsx`:
- Add `export const revalidate = false` at the top (NOT `force-dynamic` — that disables prefetching and caching)
- Only use `force-dynamic` if the page data can change without a user mutation (e.g. background cron jobs, filesystem reads)
- Select only the columns the list view renders — never `...getTableColumns(table)`
- Query the DB using the singleton from `lib/db.ts`
- Pass initialData to the client component as props

**Step 4b — Register startup revalidation**
In `app/api/startup-revalidate/route.ts`, add `revalidatePath("/[module]")` to the POST handler. This ensures a fresh Docker deploy never serves stale build-time seed data on first visit — the entrypoint calls this endpoint once the server is up.

**Step 5 — Client component**
Create `app/components/[Module]Landing.tsx`:
- `"use client"` at the top
- Accept initialData as props, store in useState
- All mutations call fetch() to API routes and update local state with the response

**Step 5b — Loading skeletons**
Create `app/[module]/loading.tsx` (and `app/[module]/[id]/loading.tsx` if there's a detail route).
- No `"use client"` needed — these are plain server components
- Use `animate-pulse` skeleton divs that approximate the real layout
- This is required: without it, navigating to the module shows a blank screen until SSR finishes

**Step 6 — Enable in sidebar**
Add an entry to the `modules` array in `app/components/Sidebar.tsx` with `active: true`.

**Step 7 — Update CLAUDE.md**
- Add the new module to the "Active Modules" section in `CLAUDE.md`
- Add any new settings keys to the "Settings System" section if applicable
- Add any new lib/ utilities to the documentation

**Step 7b — Update Architecture Overview**
PATCH the Architecture Overview doc (id=7) via `curl -X PATCH http://localhost:3000/api/docs/7`:
- Section 4 (DB schema ERD): add the new table and any FK relationships
- Section 6 (routing map): add the new page(s) and component(s) under the layout node

**Step 8 — Update project tasks**
In the "Command Center" project (`/projects/1`), add:
- Done items for each step just completed (tags: [module-name])
- Todo items for any known follow-up work (tags: [module-name])
- Idea items for future enhancements discovered during planning (tags: [module-name])

**Step 9 — Upload plan doc**
POST the plan file content to `/api/docs` with title "Plan: [Module Name]", tags "planning,[module-name]", projectId 1.

**Step 10 — Update this skill**
If any step required doing something not covered above — a convention that diverged, an extra file that was needed, a gotcha hit during migration or API wiring — add it to the relevant step so the next module benefits. Keep additions concrete and minimal.

**Step 11 — Smoke check (optional)**
If the server is running, run `/smoke-check` to verify the new module's API routes and page respond correctly before closing out.

**Step 12 — Rebuild Docker image**
Run `/rebuild-image` to bake the new module's schema and seed data into the Docker image. This keeps the image teammates receive up-to-date automatically.
