# Command Center — News Feed Feature

## Context
Building the news feed module for the Command Center. The goal is automated ingestion of RSS feeds on a schedule, stored in SQLite, displayed in a full dashboard UI that replaces the default Next.js home page.

**Stack in use:** Next.js 15 App Router, Drizzle ORM, SQLite (better-sqlite3), node-cron, Tailwind CSS v4, TypeScript

---

## Requirements
- Fetch every 3 hours (`0 */3 * * *`), system timezone
- Three seed sources: Hacker News, ScienceDaily (fluid dynamics), The Rundown AI
- Full dashboard UI: news feed list (main) + feed source manager (sidebar)
- Manual refresh trigger via the UI

---

## New Package
```
npm install rss-parser
npm install -D @types/rss-parser
```

---

## Files to Create / Modify

### 1. `lib/fetcher.ts` (new)
Core RSS fetching logic:
- `fetchFeed(source: FeedSource)` — fetches one RSS feed, returns parsed items
- `fetchAllFeeds()` — queries all active sources from DB, calls fetchFeed for each, upserts into `news_items` (skip duplicates via unique URL constraint)
- Uses `rss-parser` package
- Handles errors per-feed without crashing the whole batch

### 2. `instrumentation.ts` (new, at project root)
Next.js server startup hook — runs once when the server initializes:
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron')
    const { fetchAllFeeds } = await import('./lib/fetcher')
    cron.schedule('0 */3 * * *', fetchAllFeeds)
  }
}
```
The `NEXT_RUNTIME === 'nodejs'` guard prevents this from running in the Edge runtime.

### 3. `db/seed.ts` (new)
Inserts the three seed feed sources (idempotent — skips if already present):
- **Hacker News** — `https://news.ycombinator.com/rss` — topics: `tech`
- **ScienceDaily Fluid Dynamics** — `https://www.sciencedaily.com/rss/matter_energy/fluid_dynamics.xml` — topics: `science,fluid-dynamics`
- **The Rundown AI** — `https://www.therundown.ai/feed` — topics: `ai,tech` *(URL to verify — newsletter sites sometimes lack RSS)*

Add script to `package.json`: `"seed": "npx tsx db/seed.ts"`

### 4. API Routes

**`app/api/news/route.ts`** — GET
- Query params: `limit` (default 50), `source` (feedSourceId filter)
- Returns news items ordered by `publishedAt` desc, joined with source name

**`app/api/feeds/route.ts`** — GET + POST
- GET: returns all feed sources
- POST: adds a new feed source

**`app/api/feeds/[id]/route.ts`** — PATCH + DELETE
- PATCH: toggle `active` field
- DELETE: remove source (and its news items)

**`app/api/feeds/refresh/route.ts`** — POST
- Manually triggers `fetchAllFeeds()`, returns count of new items added

### 5. Dashboard UI

**`app/page.tsx`** (replace boilerplate) — Server Component
- Fetches initial news items and feed sources server-side
- Renders `<Dashboard>` with that data

**`app/components/Dashboard.tsx`** (new) — Client Component
- Two-column layout: main feed + right sidebar
- Manages selected source filter state

**`app/components/NewsFeed.tsx`** (new) — Client Component
- List of news cards: title (link), source name, published date, summary (truncated)
- "Refresh" button that calls `/api/feeds/refresh`
- Filter by feed source

**`app/components/FeedSources.tsx`** (new) — Client Component
- Lists feed sources with active toggle
- Add new source form (name, url, type, topics)
- Delete button per source

---

## UI Style
Dark "command center" aesthetic using Tailwind:
- Background: `gray-950`, panels: `gray-900`, borders: `gray-800`
- Accent: `emerald-400` for active states and highlights
- Monospace font for timestamps

---

## Verification
1. `npm run seed` — seeded sources appear in SQLite Viewer
2. `POST /api/feeds/refresh` via browser or fetch — returns `{ added: N }`
3. News items visible in SQLite Viewer under `news_items`
4. Dashboard at `http://localhost:3000` shows articles and sidebar
5. Adding/toggling/deleting a source via the sidebar works
