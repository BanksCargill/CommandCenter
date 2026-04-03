# Plan: Docs CLI + File Backing + Title Filter

## Context

The goal is to make docs usable outside the running app — so Claude can `Read` a markdown file directly, compare documents, summarize, review, etc. without constructing large inline strings or hitting an API. Three features work together toward this:

1. **CLI scripts** — direct Drizzle access, no server required
2. **File-backed docs** — `.md` files on disk, readable locally without any tooling
3. **Title filter** — `GET /api/docs?title=Talk:*` for targeted document retrieval

---

## Feature 1: CLI Scripts (`scripts/docs.ts`)

No meaningful design tradeoff here — thin Drizzle wrapper with `async function main()` pattern, as specified.

**Commands:**
```
npx tsx scripts/docs.ts get <id>          # print doc content to stdout
npx tsx scripts/docs.ts list              # list all docs (id, title, tags)
npx tsx scripts/docs.ts patch <id> <file> # read file, PATCH content in DB
```

**Pattern:** Reuses `lib/db.ts` and `db/schema.ts` directly. Wraps everything in `async function main()` to avoid top-level await issues. No server needed.

**Critical files:**
- `scripts/docs.ts` ← new file
- `lib/db.ts` ← imported (read-only)
- `db/schema.ts` ← imported (read-only)

---

## Feature 2: File-backed Docs

**The core question:** Where do files live, and what triggers sync?

### Option A: CLI-managed mirror in `docs/` folder  ✅ Recommended

Files live at `docs/<id>-<slug>.md` (e.g. `docs/7-architecture-overview.md`).

Sync is manual via CLI commands (added to `scripts/docs.ts`):
```
npx tsx scripts/docs.ts sync              # DB → files (all docs)
npx tsx scripts/docs.ts sync <id>         # DB → file (one doc)
npx tsx scripts/docs.ts push <id>         # file → DB (reads docs/<id>-*.md)
```

**Pros:**
- Files are plain `.md`, readable with any editor or `Read` tool — zero tooling
- Claude can `Read docs/7-architecture-overview.md` directly
- Simple: no new API routes needed for the file-backing goal
- `sync` becomes the "checkpoint" command — run it after any session that edits docs

**Cons:**
- Manual sync — files can drift from DB if you edit via the web UI and forget to sync
- Slug in filename can change if title changes (mitigated: id prefix makes them stable)

---

### Option B: API export/import endpoints + CLI wrappers

Add `/api/docs/<id>/export` (GET → raw markdown) and `/api/docs/<id>/import` (POST ← file upload). CLI wraps these with `curl` or `fetch`.

**Pros:**
- Clean REST API; useful if you ever expose the app externally
- Import via web UI possible (drag-and-drop `.md` file)

**Cons:**
- Requires running server for the API paths
- Doesn't solve the "read locally without anything running" requirement
- More code for the same net result (CLI already hits Drizzle directly)

---

### Option C: Frontmatter-aware sync (metadata embedded in files)

Files include YAML frontmatter:
```markdown
---
title: Architecture Overview
tags: planning,architecture
pinned: true
projectId: 1
---
# actual content...
```

`push` reads frontmatter and updates all fields, not just content.

**Pros:**
- Files are fully self-contained — title/tags/pinned state survive without the DB
- Could theoretically reconstruct the DB from files alone

**Cons:**
- More complex: frontmatter parsing (gray-matter or hand-rolled)
- Claude editing a file must preserve frontmatter format
- Overkill for current use case (title edits happen in the UI, not via files)

---

**Recommendation: Option A** — CLI mirror in `docs/`, manual sync, no frontmatter. Files are plain markdown, Claude reads them directly, `sync` keeps them fresh. If you later want to edit metadata in files, we can add frontmatter support incrementally.

---

## Feature 3: Title Pattern Filter (`GET /api/docs?title=`)

### Option A: SQL LIKE (server-side, Drizzle)

Add `?title=` param to `GET /api/docs`. Translate glob `*` → SQL `%` and use Drizzle's `like()`.

```
GET /api/docs?title=Talk:*     → SQL: title LIKE 'Talk:%'
GET /api/docs?title=*Overview  → SQL: title LIKE '%Overview'
```

**Pros:** Efficient for large doc sets; consistent with existing server-side API
**Cons:** Slightly more API route code; glob-to-LIKE translation is a small edge case

---

### Option B: Client-side filter (no API change)

Extend existing client-side search in `DocsLanding.tsx` to support title: prefix or a separate title filter input.

**Pros:** Zero backend change; already have client-side search infrastructure
**Cons:** Requires fetching all docs first — inefficient for token usage; doesn't help CLI usage

---

### Option C: Exact title match only (simpler API)

`?title=Architecture Overview` does case-insensitive exact match (SQL: `lower(title) = lower(?)`).

**Pros:** Simpler code, no glob translation
**Cons:** Less useful — you often don't know the exact full title; pattern matching is the whole point

---

**Recommendation: Option A** — SQL LIKE with `*`→`%` glob translation. Also add `?title=` support to the CLI `list` command so it works without a server too.

---

## Implementation Plan

### Phase 1: CLI (`scripts/docs.ts`)
1. Create `scripts/docs.ts` with `main()` wrapper
2. Implement `get <id>` — fetch by id, print content to stdout
3. Implement `list [--title <pattern>]` — print id + title + tags table
4. Implement `patch <id> <file>` — read file, update content in DB

### Phase 2: File sync commands
5. Add `sync [id]` command — write doc(s) from DB to `docs/<id>-<slug>.md`
6. Add `push <id>` command — read `docs/<id>-*.md`, patch content in DB
7. Ensure `docs/` is gitignored (local mirror, not tracked) — or committed (your call)

### Phase 3: Title filter API
8. Update `GET /api/docs` in `app/api/docs/route.ts` — add `?title=` param, SQL LIKE
9. Update CLI `list` to accept `--title` and apply same pattern logic via Drizzle

### Phase 4: Upload to Docs + Verification
10. POST this plan to `/api/docs` (title: "Plan: Docs CLI + File Backing + Title Filter", tags: planning,docs, projectId: 1)

### Verification
- `npx tsx scripts/docs.ts list` → prints table of all docs
- `npx tsx scripts/docs.ts get 7` → prints Architecture Overview content
- `npx tsx scripts/docs.ts sync` → creates files in `docs/`; open one in editor to confirm it's readable
- `npx tsx scripts/docs.ts patch 7 docs/7-architecture-overview.md` → updates DB
- `GET /api/docs?title=Talk:*` → returns only Talk: docs
- `npx tsx scripts/docs.ts list --title "Talk:*"` → same result, no server

---

## Decisions

- **Location:** `docs/` at repo root, git-tracked
- **Naming:** `<id>-<slug>.md` (e.g. `7-architecture-overview.md`)
- **API endpoints:** CLI only, no new API routes

---

## Sync Strategy (git-tracked files)

The user wants edits in either the web UI or the `.md` file to stay in sync. Two sync directions needed:

### Direction 1: DB → File (UI edits)

**Automated via API write-through:** After every `POST /api/docs` and `PATCH /api/docs/[id]`, the API route also writes (or updates) `docs/<id>-<slug>.md` on disk. Web UI edits are automatically reflected in files — no manual step.

- If a title changes, the old slug file is deleted and the new one is written
- File writes happen synchronously in the API handler (SQLite is fast, file write is cheap)

### Direction 2: File → DB (markdown editor edits)

**Manual via CLI `push`:** When Claude or the user edits a `.md` file directly, run:
```
npx tsx scripts/docs.ts push <id>
```
This is the correct tradeoff — file edits are intentional, so an explicit push makes sense.

**Optionally: Claude Code hook** for automated file→DB push after Claude edits a `docs/*.md` file. Can be added via `/update-config` after implementation if desired.

### Initial population
```
npx tsx scripts/docs.ts sync   # one-time: writes all current DB docs to docs/
git add docs/ && git commit -m "chore: add file-backed docs mirror"
```

After that, the API write-through keeps files current automatically.
