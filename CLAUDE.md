# Command Center — Claude Context Guide

Personal productivity dashboard. Next.js 15 App Router, React 19, SQLite via Drizzle ORM, Tailwind CSS v4. Single user, local deployment.

---

## Claude Maintenance Responsibilities

After completing any non-trivial work, Claude must:

1. **Upload planning documents to the Docs module** — whenever a plan file is created (e.g. during `/new-module` or other planning phases), POST its content to `/api/docs` once the work is complete. Use:
   - `title`: descriptive name (e.g. "Plan: Memories Module")
   - `tags`: `planning,[module-name]`
   - `projectId`: 1 (Command Center project)
   - `content`: full markdown content of the plan file
   Do this at the end of the session, after the plan has been executed.

2. **Update the Architecture Overview doc** (Docs module, id=7, pinned) if any of the following changed:
   - A new module was added → update sections 2, 4, and 6 (module pattern, schema ERD, routing map)
   - A new DB table or significant column was added → update section 4 (ERD)
   - A new background job or adapter was added → update section 5
   - A major data flow or convention changed → update the relevant section
   PATCH the doc via `fetch("/api/docs/7", { method: "PATCH", body: JSON.stringify({ content: updatedContent }) })`.

3. **Update this file (CLAUDE.md)** if any of the following changed:
   - A module was added or enabled → add it to "Active Modules"
   - New settings keys were added → update the "Settings System" section
   - A new `lib/` utility was created → document it
   - A convention changed → update "Conventions"

4. **Update project tasks** in the "Command Center" project (`/projects/1`):
   - Completed features → Done (tagged by module)
   - Work in progress → Todo
   - New ideas discovered → Ideas
   - Use `tags` to indicate module: `news-feed`, `projects`, `settings`, `memories`, etc.

5. **Do not create a new project per module.** "Command Center" is the single app roadmap. Module-specific projects are only justified when a module has 10+ active granular tasks — and should be archived once that module stabilizes.

6. **Flag extractable patterns — proactively, during work, not just at the end.** If you notice a candidate while implementing something, call it out in your response at that moment so the user can decide immediately. Don't batch these up for a closing summary.
   - A repeated action or workflow → suggest a **skill** (`.claude/commands/[name].md`)
   - A persistent fact, rule, or preference → suggest a **memory file** (`memory/[name].md`)
   - An automated action tied to a Claude event → suggest a **hook** (settings.json `hooks`)
   Examples: generating a Mermaid diagram more than once → memory rule; running a sequence of steps every module → skill; always running a linter after edits → hook.

7. **After any new module is scaffolded** (new migrations applied), run `/rebuild-image` so the Docker image stays current. Teammates who pull the updated image will receive the new schema and accumulated seed data.

8. **Every plan file must include an "Upload to Docs" step** immediately before the Verification section. This makes completed plans searchable in the app and creates a useful historical record.

---

## Skills (Slash Commands)

Reusable workflows live in `.claude/commands/` — these are **skills** (project-scoped). Each skill self-updates: if execution surfaces a gap the skill would have missed, update the skill file before finishing.

| Skill | When to run |
|-------|-------------|
| `/sync-projects` | After any non-trivial feature work to reconcile CLAUDE.md and the project board |
| `/new-module` | To scaffold a new module end-to-end |
| `/smoke-check` | On-demand — after scaffolding a new module, or any time you want to verify the running app is healthy |
| `/rebuild-image` | After any new module or migration — refreshes the Docker seed DB |

**Frontmatter required:** Every skill file must include `description` and `allowed-tools` frontmatter so Claude Code can surface and scope it correctly.

**Self-updating convention:** Every skill in `.claude/commands/` includes a final step that updates the skill itself if execution revealed a blind spot or new pattern. This keeps skills accurate without a separate maintenance pass. When adding a new skill, include this step.

---

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 15 App Router | `standalone` output for Docker |
| UI | React 19 + Tailwind v4 | Dark theme: `bg-gray-950 text-gray-100` |
| Icons | lucide-react | |
| DB | SQLite (better-sqlite3) | WAL mode, file at `db/command-center.db` |
| ORM | Drizzle ORM | Schema in `db/schema.ts`; migrations in `drizzle/` |
| Drag & drop | @dnd-kit/core | Kanban board only |
| Markdown | react-markdown + remark-gfm | Docs module — GFM tables, task lists, strikethrough |
| Diagrams | mermaid | Docs module — renders sequence/class/flow diagrams from fenced ```mermaid blocks |
| Syntax highlighting | react-syntax-highlighter (vscDarkPlus) | Docs module — fenced code blocks with language detection |
| Cron | node-cron | Registered in `instrumentation.ts` |

---

## Architecture Pattern

Every module follows this shape:

```
app/[module]/page.tsx              ← SERVER component; runs DB queries; passes initialData as props
app/[module]/[id]/page.tsx         ← (detail view, if needed)
app/components/[Module]Landing.tsx ← "use client"; receives initialData; manages local state + API calls
app/components/[Module]Board.tsx   ← (detail client component, if needed)
app/api/[module]/route.ts          ← GET (list) + POST (create)
app/api/[module]/[id]/route.ts     ← PATCH (update) + DELETE
db/schema.ts                       ← add table + export inferred types
drizzle/                           ← auto-generated migration via `npx drizzle-kit generate`
app/components/Sidebar.tsx         ← add one entry to the `modules` array (active: true to enable)
```

**Data flow:** Server page queries DB → passes as `initialData` prop → client component stores in `useState` → mutations call `fetch()` to API routes → update local state with response.

**No global state.** No SWR, no React Query, no Zustand. `useState` + direct `fetch()` is intentional for this scale.

---

## Active Modules

### News Feed `/`
- Page: `app/page.tsx` — loads up to 500 `news_items` with `feedSources` join
- Components: `app/components/NewsFeed.tsx`, `app/components/FeedSources.tsx`
- API: `app/api/feeds/` (CRUD + `refresh/` POST for manual trigger), `app/api/news/`
- Feed fetching: `lib/fetcher.ts` — 5 adapters (RSS, HN Algolia, Reddit, DEV.to, Lobsters)
- Cron: `instrumentation.ts` — runs hourly, checks `fetch_interval_hours` setting, auto-purges

### Projects `/projects`
- Landing: `app/projects/page.tsx` → `app/components/ProjectsLanding.tsx`
- Board: `app/projects/[id]/page.tsx` → `app/components/ProjectBoard.tsx` + `ProjectCard.tsx`
- API: `app/api/projects/route.ts`, `app/api/projects/[id]/route.ts`, `app/api/projects/[id]/items/`

### Settings `/settings`
- Page: `app/settings/page.tsx` — fully client-side; fetches `/api/settings` on mount
- API: `app/api/settings/route.ts` (GET/PUT), `/stats` (GET), `/purge` (POST)
- Helper: `lib/settings.ts` — `getSetting`, `getSettingInt`, `getSettingBool`, `setSetting`, `getAllSettings`
- Default values live in `lib/settings.ts → SETTING_DEFAULTS`

### Docs `/docs`
- Landing: `app/docs/page.tsx` → `app/components/DocsLanding.tsx` — list with client-side search + project filter, pin toggle
- Detail: `app/docs/[id]/page.tsx` → `app/components/DocDetail.tsx` — view/edit toggle, markdown render, file upload
- API: `app/api/docs/route.ts` (GET list + POST create), `app/api/docs/[id]/route.ts` (PATCH + DELETE)
- Features: pinning (pinned-first sort), project FK association, tags (comma-separated), updated_at tracking, `.md` file upload via FileReader
- Rendering: `react-markdown` + `remark-gfm` (tables, task lists, strikethrough) + `react-syntax-highlighter` (code blocks) + `MermaidBlock` component (sequence/class/flow diagrams from fenced `mermaid` blocks)
- Both pages pass `docs` (with left-joined `projectName`) and `projects` list as props
- **Title filter:** `GET /api/docs?title=Talk:*` — glob `*` → SQL LIKE `%`; works in CLI too
- **File mirror:** `docs/<id>-<slug>.md` at repo root — git-tracked, auto-written by API on every create/update. CLI: `sync` (DB→files), `push <id>` (file→DB)
- **CLI:** `npx tsx scripts/docs.ts [get|list|patch|sync|push]` — no server required, direct Drizzle access
- **Write-through helper:** `lib/doc-files.ts` — `writeDocFile`, `deleteDocFile` used by API routes

### Chelsea FC `/chelsea`
- Landing: `app/chelsea/page.tsx` → `app/components/ChelseaLanding.tsx` — five tabs: Chelsea News Feed, Schedule, Champions League, International, World Cup
- Schedule sub-component: `app/components/ChelseaSchedule.tsx` — upcoming fixtures + results, sync button, manual add; `defaultCompetition` prop pre-fills the add form
- Standings: `app/components/PLStandings.tsx` — PL standings table rendered to the right of the Schedule tab; fetches `/api/chelsea/standings` on mount; Chelsea row highlighted blue
- API: `app/api/chelsea/matches/route.ts` (GET `?team=` filter + POST), `app/api/chelsea/matches/[id]/route.ts` (PATCH + DELETE), `app/api/chelsea/sync/route.ts` (POST `?team=` — triggers football-data.org fetch), `app/api/chelsea/standings/route.ts` (GET, cached 1 hour — calls `/competitions/PL/standings`)
- Feed fetcher: `lib/football-fetcher.ts` — exports `fetchChelseaFixtures()`, `fetchEnglandFixtures()`, `fetchUsaFixtures()`, `fetchUCLFixtures()`, `fetchWorldCupFixtures()`; `CHELSEA_TEAM_ID = 61` exported; football-data.org v4 API
  - Free tier: Chelsea PL, England, USA national teams, World Cup
  - Paid plan required: Champions League (`/competitions/CL/matches`)
  - UCL/World Cup finished matches stored as `result="draw"` (neutral competition — home-team win/loss is meaningless; score tells the story)
- Cron: `instrumentation.ts` — daily at 6am, calls `fetchChelseaFixtures()`
- News from `news_items` via `feed_sources.topic_tags` (`chelsea`, `england`, `usa`); FeedSources sidebar (`app/components/FeedSources.tsx`) reused on the right of news-type tabs, filtered per tab by topic tag
- **API key:** Set `football_api_key` in Settings to enable fixture sync and PL standings

### Memories `/memories` ← STUBBED (disabled in Sidebar)

---

## Database

**Schema:** `db/schema.ts`
**Connection singleton:** `lib/db.ts` — import `{ db }` in server components and API routes only. Never in client components.

**Tables:**

| Table | Key columns | Notes |
|-------|-------------|-------|
| `feed_sources` | id, name, url, type, adapter, topic_tags, active | `adapter` = hn-algolia \| reddit \| devto \| lobsters \| null (RSS); `topic_tags` = comma-separated |
| `news_items` | id, feed_source_id, title, url, summary, score, published_at, fetched_at | `url` is unique; `summary` optional |
| `project_items` | id, project_id, title, notes, tags, status (idea/todo/done), archived, sort_order | `tags` comma-separated; status transitions set `started_at`/`completed_at` |
| `projects` | id, name, description, archived | |
| `settings` | key (PK), value, updated_at | key-value store |
| `docs` | id, title, content, tags, project_id, pinned, created_at, updated_at | markdown documents; `project_id` FK nullable (`set null` on project delete); `tags` comma-separated |
| `chelsea_matches` | id, team, external_id, match_date, opponent, competition, venue, result, score, notes | `team` = chelsea\|england\|usa\|world_cup\|ucl (default: chelsea); `external_id` = football-data.org match ID for dedup; `result` = win\|draw\|loss\|upcoming |
| `memories` | id, content, tags, source | unused/future |

**Inferred types** exported from `db/schema.ts`:
```typescript
import type { ChelseaMatch, Doc, FeedSource, NewsItem, Project, ProjectItem, Setting } from "@/db/schema";
```

**Migrations:** `npx drizzle-kit generate` (creates SQL in `drizzle/`), then `npx drizzle-kit migrate` (applies to DB).

---

## Conventions

- **`export const dynamic = "force-dynamic"`** — only use this on pages where data can change between requests WITHOUT a user mutation: the News Feed (cron writes), and any detail page that reads the filesystem (docs `[id]`). Do NOT apply it globally.
- **`export const revalidate = false`** — use on list pages (projects, docs) that only change via user mutations. Caches the page indefinitely; combined with `revalidatePath` in API routes this gives instant re-navigation after the first load.
- **`revalidatePath(path)`** — must be called in every API route handler that mutates data shown on a cached page. Import from `next/cache`. Place it immediately before the final `return`. Forgetting this causes stale data after mutations.
- **Tailwind dark theme:** bg-gray-950 (background), bg-gray-900 (elevated), border-gray-800 (dividers), text-emerald-400 (active/accent), text-amber-400 (warning/todo)
- **Optimistic updates:** client updates `useState` immediately, then reconciles with API response
- **API error responses:** `{ error: "message" }` with appropriate status code
- **Sidebar enable/disable:** set `active: true/false` in the `modules` array in `app/components/Sidebar.tsx`
- **Lint before Docker:** `npm run lint` must pass before `docker compose up --build` will succeed (ESLint errors = build failure). After any code edits, Claude must run `npm run lint` and fix all errors — not just warnings — before closing out. Common culprits: unused imports, `let` where `const` suffices.

---

## Performance Conventions

### Every new module must include a `loading.tsx`
Place `app/[module]/loading.tsx` (and `app/[module]/[id]/loading.tsx` for detail routes) alongside the page. Next.js shows it instantly on navigation while the server component renders. Use `animate-pulse` skeleton divs that approximate the page layout. No client imports needed — these are pure server components.

### List queries must not select large columns
Server pages that power list views (e.g. docs list) must select only the columns the list UI renders. Never use `...getTableColumns(table)` on a page that doesn't need every column — `content` columns can be large. Pass a narrower type to the client component and define it explicitly with the needed fields (not as `Omit<FullType, "content">` — write the type out so it's clear and stable).

### Lazy-load heavy rendering libraries
`MermaidBlock` and `react-syntax-highlighter` are large. Import them via `next/dynamic` in any component that uses them, so they're only bundled when that component is actually rendered. Template:
```tsx
import dynamic from "next/dynamic";
const MermaidBlock = dynamic(() => import("@/app/components/MermaidBlock"), { ssr: false });
const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((m) => ({ default: m.Prism })),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-900 rounded-lg p-4 h-16" /> }
);
```
The `vscDarkPlus` theme object can stay as a static import (it's a plain JS object, not the rendering engine).

---

## Mermaid & Markdown Conventions

Lessons from the Docs module. Apply whenever generating Mermaid diagrams or using react-markdown.

**react-markdown v9+ — code renderer split**
- Override `pre` for fenced/block code; override `code` for inline only
- The `inline` prop is no longer passed in v9+ — using it causes `<div>` inside `<p>` hydration errors
- In the `pre` override, extract language + code from `node.children[0]` (AST), not React children

**Mermaid syntax rules (v11)**
- **No real newlines in node labels** — `\n` inside a JS template literal becomes a real newline and breaks parsing; use ` - ` or `<br/>` instead
- **Subgraph title syntax:** `subgraph id ["Label"]` (space before bracket, lowercase id) — NOT `subgraph ID["Label"]` (that's node syntax)
- **ERD field descriptions:** avoid `|` inside quoted descriptions — it confuses the parser; put enums in prose below the diagram
- **Emojis in labels:** avoid in programmatically generated content — can cause rendering failures
- **Uploading via Node.js scripts:** content written inside JS template literals and POSTed to the API will contain real newlines — design labels to be single-line

**If a new Mermaid or react-markdown rendering issue is discovered:** fix it, then update both this section AND `memory/feedback_mermaid_markdown.md` with the new rule before closing out. Do not leave lessons only in conversation history.

---

## Settings System

All user-configurable behaviour lives in the `settings` table. Access via `lib/settings.ts`:

```typescript
getSetting("fetch_interval_hours")   // → "3"
getSettingInt("digest_size")         // → 5
getSettingBool("digest_default_on")  // → true
setSetting("last_fetched_at", iso)   // upserts
getAllSettings()                     // → Record<string, string> merged with defaults
```

Current settings keys: `fetch_interval_hours`, `digest_size`, `digest_default_on`, `retention_days`, `last_fetched_at`, `news_feed_limit`, `football_api_key`

- `football_api_key` — Enables Chelsea/England/USA/UCL/World Cup fixture sync (via `POST /api/chelsea/sync?team=<team>`) and PL standings fetch (`GET /api/chelsea/standings`). Free tier from football-data.org covers Chelsea, England, USA, and World Cup. Champions League requires a paid plan.

---

## Cron / Background Jobs

`instrumentation.ts` runs in Node.js runtime only (`NEXT_RUNTIME === "nodejs"`).

Current job (every hour):
1. Checks `fetch_interval_hours` — skips if not enough time since `last_fetched_at`
2. Calls `fetchAllFeeds()` (lib/fetcher.ts) — fetches all active sources concurrently (max 4 at once)
3. Updates `last_fetched_at` setting
4. Auto-purges news older than `retention_days`

---

## Security Checklist

Run through this checklist for **every new API route** and **every new client component that renders external data**. This checklist is also enforced by `/new-module`.

### API routes
- [ ] **ID params:** use `parseId(id)` from `lib/url-validator.ts`; return 400 if null
- [ ] **User-supplied URLs:** call `validateFeedUrl(url)` from `lib/url-validator.ts` before storing; return 400 on failure
- [ ] **Large content fields:** add a size check (e.g. `raw.length > 5 * 1024 * 1024`) and return 413
- [ ] **Destructive endpoints** (DELETE, purge, refresh): confirm they are covered by `middleware.ts` localhost guard

### Client components
- [ ] **Links from external data:** wrap `href` with `safeHref(url)` from `lib/url-validator.ts` to block `javascript:` URIs
- [ ] **Raw HTML injection** (e.g. `innerHTML`, Mermaid SVG): sanitize with `DOMPurify.sanitize()`
- [ ] **User-uploaded files:** validate file type and size server-side, not just via HTML `accept`

### Shared utilities
- `lib/url-validator.ts` — `parseId`, `validateFeedUrl`, `safeHref`
- `DOMPurify` — installed; import in any client component using `innerHTML`

### Automated gates (already wired)
- **Pre-commit hook** (`.githooks/pre-commit`): blocks commits with high/critical npm CVEs
- **ESLint** (`eslint-plugin-security`): flags unsafe patterns at author time
- **`middleware.ts`**: rejects non-local API requests in production

---

## How to Add a New Module

1. **Schema:** Add table to `db/schema.ts`, export inferred types
2. **Migrate:** `npx drizzle-kit generate && npx drizzle-kit migrate`
3. **API routes:** `app/api/[module]/route.ts` (GET + POST), `[id]/route.ts` (PATCH + DELETE)
   - Add `revalidatePath("/[module]")` in every handler that writes to the DB (POST, PATCH, DELETE)
   - Import `revalidatePath` from `next/cache`
4. **Server page:** `app/[module]/page.tsx` — query DB, pass to client component
   - Use `export const revalidate = false` (not `force-dynamic`) unless the page changes from background jobs or filesystem reads
   - Select only the columns the list view actually renders — never `...getTableColumns(table)` on a list page
5. **Client component:** `app/components/[Module]Landing.tsx` — `"use client"`, useState, fetch mutations
6. **Enable:** Add to `modules` array in `app/components/Sidebar.tsx` with `active: true`

---

## Seeding & Dev Scripts

```bash
npx tsx db/seed.ts               # Seed feed sources (AUTO-GENERATED — see db:export-seeds)
npx tsx db/seed-projects.ts      # Seed all projects + items (AUTO-GENERATED)
npx tsx db/seed-settings.ts      # Seed settings table (AUTO-GENERATED)
npx drizzle-kit generate         # Generate migration from schema changes

# DB sync (git-based cross-machine sync)
npm run db:checkpoint            # Flush WAL → main .db file (run before committing)
npm run db:export-seeds          # Regenerate seed files from live DB
npm run db:pull-sync             # Apply pending migrations (run after git pull)
npm run db:commit                # Checkpoint + stage db/ files (then git commit manually)

# Docs CLI (no server required)
npx tsx scripts/docs.ts list                   # List all docs
npx tsx scripts/docs.ts list --title "Talk:*"  # Filter by title pattern
npx tsx scripts/docs.ts get <id>               # Print doc content
npx tsx scripts/docs.ts patch <id> <file.md>   # Update doc content from file
npx tsx scripts/docs.ts sync                   # DB → docs/*.md (all docs)
npx tsx scripts/docs.ts sync <id>              # DB → docs/<id>-<slug>.md (one doc)
npx tsx scripts/docs.ts push <id>              # docs/<id>-*.md → DB
npx tsx scripts/docs.ts import <file.md>       # new .md file → new DB record
npx drizzle-kit migrate          # Apply pending migrations
npx drizzle-kit studio           # Open Drizzle Studio (DB browser)
```

## DB Sync Workflow

The `.db` file is committed to git as the primary sync mechanism — `git pull` gives you current data immediately.

**Before committing DB changes:**
```bash
npm run db:checkpoint     # flush WAL → main .db file
npm run db:export-seeds   # regenerate seed scripts from live DB
npm run db:commit         # stage db/ files (then git commit manually)
```

**After `git pull` (if post-merge hook didn't fire):**
```bash
npm run db:pull-sync      # applies pending migrations
```

**Activate git hooks (once per clone):**
Run `setup.sh` in Git Bash — activates `pre-commit` (auto-checkpoint) and `post-merge` (auto-migrate) hooks from `.githooks/`.

**Notes:**
- `last_fetched_at` is excluded from seed-settings.ts — it's runtime state, not configuration
- `db/seed-settings-project.ts` is now a shim — Settings project data is in `seed-projects.ts`
- Seed files are AUTO-GENERATED by `scripts/export-seeds.ts` — do not edit by hand
