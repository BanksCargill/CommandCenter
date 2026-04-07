# Plan: Chelsea FC Hub Module

## Execution Note

Use the `/new-module` skill to scaffold this module. The steps below map to that skill's workflow, with Chelsea-specific additions called out.

---

## Context

The user follows Chelsea FC and wants a dedicated dashboard module surfacing club news, highlight links, the match schedule, and international team (England + USMNT) news — all in one place with tab-based navigation. This is a natural extension of the existing News Feed infrastructure, reusing the `newsItems` / `feedSources` tables for article content while adding a small new `chelsea_matches` table for structured schedule data.

---

## Architecture Decision

**Hybrid approach:**
- **News + Highlights + International tabs** → reuse existing `newsItems` + `feedSources` pipeline. Tag sources with topic_tags like `chelsea`, `highlights`, `england`, `usa` so the page can filter without new schema.
- **Schedule tab** → new `chelsea_matches` table. Schedule data is fundamentally different (structured: date, opponent, competition, result) and doesn't fit the news_items shape.

---

## 1. Schema Addition

Add one new table to `db/schema.ts`:

```typescript
export const chelseaMatches = sqliteTable("chelsea_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchDate: integer("match_date", { mode: "timestamp" }).notNull(),
  opponent: text("opponent").notNull(),
  competition: text("competition").notNull(), // "Premier League" | "Champions League" | "FA Cup" | etc.
  venue: text("venue", { enum: ["home", "away", "neutral"] }).notNull().default("home"),
  result: text("result", { enum: ["win", "draw", "loss", "upcoming"] }).notNull().default("upcoming"),
  score: text("score"),           // "2-1", null if upcoming
  notes: text("notes"),           // optional match notes / link
});
export type ChelseaMatch = typeof chelseaMatches.$inferSelect;
export type NewChelseaMatch = typeof chelseaMatches.$inferInsert;
```

Run: `npx drizzle-kit generate && npx drizzle-kit migrate`

---

## 2. Feed Sources to Seed

Add these entries tagged so each tab can filter them. Topic tags drive tab filtering — no code changes needed to fetcher.ts.

| Name | URL / Adapter | topic_tags |
|---|---|---|
| Chelsea FC — BBC Sport | `https://feeds.bbci.co.uk/sport/football/teams/chelsea/rss.xml` (RSS) | `chelsea` |
| r/chelseafc | Reddit adapter — `chelseafc` subreddit | `chelsea` |
| Chelsea FC YouTube | `https://www.youtube.com/feeds/videos.xml?channel_id=UCdN2g8KBhCMFXPRgTXz-4sQ` (RSS) | `chelsea,highlights` |
| England Football — BBC | BBC England national team RSS | `england` |
| r/ussoccer | Reddit adapter — `ussoccer` subreddit | `usa` |

---

## 3. Football API Integration (Schedule Auto-Fetch)

**Service:** [football-data.org](https://www.football-data.org/) — free tier covers Premier League, Champions League, FA Cup fixtures.

**New setting key:** `football_api_key` stored in the `settings` table. Shown in the Settings page under a new "Chelsea FC" section.

**New lib:** `lib/football-fetcher.ts`
- `fetchChelseaFixtures()` — calls `https://api.football-data.org/v4/teams/61/matches` (Chelsea's team ID = 61), parses upcoming + recent matches, upserts into `chelsea_matches` table (match the football-data.org match ID to avoid duplicates)
- Requires `X-Auth-Token` header using `getSettingInt("football_api_key")` (stored as string, passed as header)

**New cron job** in `instrumentation.ts` — runs daily (or on-demand via `/api/chelsea/sync`):
- Calls `fetchChelseaFixtures()`
- Revalidates `/chelsea` page

### API Routes

**`/app/api/chelsea/sync/route.ts`** — POST (manual trigger)
- Calls `fetchChelseaFixtures()`, returns `{ added, updated }`
- Protected by existing localhost middleware

**`/app/api/chelsea/matches/route.ts`** — GET + POST
- GET: returns all matches ordered by `matchDate` asc
- POST: create a manual match entry (body: `{ matchDate, opponent, competition, venue, result?, score?, notes? }`)
- Validate with `parseId` / size checks per security checklist
- Call `revalidatePath("/chelsea")` on write

**`/app/api/chelsea/matches/[id]/route.ts`** — PATCH + DELETE
- PATCH: override result/score/notes (e.g. if API is wrong or delayed)
- DELETE: remove a match
- Call `revalidatePath("/chelsea")` on write

---

## 4. Pages & Components

### `app/chelsea/page.tsx` (server component)
```typescript
export const revalidate = false; // cached; invalidated by API mutations
```
- Queries:
  - `newsItems` joined with `feedSources` WHERE `topic_tags` includes `chelsea` OR `england` OR `usa` → last 200, sorted by `publishedAt` desc
  - `chelseaMatches` → all rows ordered by `matchDate` asc
- Passes `{ newsItems, matches }` to `ChelseaLanding`

### `app/chelsea/loading.tsx` (server)
- Skeleton with tab bar placeholder + animated list rows

### `app/components/ChelseaLanding.tsx` (client)
Four tabs using the established NewsFeed tab pattern:

```
[ Chelsea ] [ Highlights ] [ Schedule ] [ International ]
```

**Chelsea tab** — newsItems where source.topic_tags includes `chelsea` (excludes highlights-only sources)  
**Highlights tab** — newsItems where source.topic_tags includes `highlights`  
**Schedule tab** — renders `ChelseaSchedule` sub-component from `matches` prop  
**International tab** — secondary sub-filter: `[ England ] [ USA ]` buttons; filters newsItems by `england` or `usa` tag

State:
```typescript
const [tab, setTab] = useState<"chelsea" | "highlights" | "schedule" | "international">("chelsea");
const [intlFilter, setIntlFilter] = useState<"england" | "usa">("england");
const [visibleCount, setVisibleCount] = useState(30);
```

Client-side filtering via `useMemo` (same pattern as DocsLanding).

### `app/components/ChelseaSchedule.tsx` (client)
- Groups matches: **Upcoming** (result=upcoming, asc by date) and **Results** (win/draw/loss, desc by date)
- Each match row: date badge, opponent, competition badge, venue, score/result chip
- "Sync fixtures" button → POST `/api/chelsea/sync` → refreshes from football-data.org
- Inline edit: click score to manually override a result if needed

---

## 5. Sidebar Registration

`app/components/Sidebar.tsx` — add to `modules` array:
```typescript
{ label: "Chelsea FC", icon: Trophy, href: "/chelsea", active: true }
```
Import `Trophy` from `lucide-react`.

---

## 6. Highlight Links — Sourcing Strategy

YouTube channel RSS is publicly available for any channel:
`https://www.youtube.com/feeds/videos.xml?channel_id=<CHANNEL_ID>`

Chelsea FC YouTube channel ID: `UCdN2g8KBhCMFXPRgTXz-4sQ`

This gives automatic highlight fetching via the existing RSS adapter — no custom adapter needed. Items land in `newsItems` tagged `highlights`.

---

## 7. `/new-module` Step Mapping

| new-module Step | Chelsea-specific action |
|---|---|
| Step 1 — Schema | Add `chelseaMatches` table |
| Step 2 — Migrate | `npx drizzle-kit generate && npx drizzle-kit migrate` |
| Step 3 — API routes | `app/api/chelsea/matches/` + `app/api/chelsea/sync/` |
| Step 3 — Settings update | Add `football_api_key` to `lib/settings.ts` defaults |
| Step 4 — Server page | `app/chelsea/page.tsx` — joins newsItems + chelseaMatches |
| Step 4b — Startup revalidate | Add `revalidatePath("/chelsea")` to startup-revalidate route |
| Step 5 — Client component | `ChelseaLanding.tsx` + `ChelseaSchedule.tsx` sub-component |
| Step 5b — Loading skeleton | `app/chelsea/loading.tsx` |
| Step 6 — Sidebar | Add "Chelsea FC" with Trophy icon, `active: true` |
| Extra — Football fetcher | `lib/football-fetcher.ts` + daily cron in `instrumentation.ts` |
| Extra — Seed sources | Seed 5 feed sources via API after server is running |

---

## 8. Files to Create / Modify

| File | Action |
|---|---|
| `db/schema.ts` | Add `chelseaMatches` table + exported types |
| `drizzle/` | Auto-generated migration |
| `lib/football-fetcher.ts` | New — `fetchChelseaFixtures()` using football-data.org API |
| `lib/settings.ts` | Add `football_api_key` to `SETTING_DEFAULTS` |
| `instrumentation.ts` | Add daily Chelsea fixture sync cron job |
| `app/api/chelsea/sync/route.ts` | New — POST manual trigger |
| `app/api/chelsea/matches/route.ts` | New — GET + POST |
| `app/api/chelsea/matches/[id]/route.ts` | New — PATCH + DELETE |
| `app/chelsea/page.tsx` | New — server page |
| `app/chelsea/loading.tsx` | New — skeleton |
| `app/components/ChelseaLanding.tsx` | New — client with tabs |
| `app/components/ChelseaSchedule.tsx` | New — schedule sub-component |
| `app/components/Sidebar.tsx` | Add "Chelsea FC" entry with Trophy icon |
| `app/settings/page.tsx` or Settings UI | Add football_api_key input field |

---

## 8. Upload to Docs

After execution, POST this plan to `/api/docs`:
- `title`: "Plan: Chelsea FC Hub Module"
- `tags`: `planning,chelsea`
- `projectId`: 1
- `content`: full markdown content of this file

---

## 9. Verification

1. `npm run lint` — no errors
2. Navigate to `/chelsea` — page loads with tab bar
3. Seed 2–3 Chelsea RSS sources via "Manage Sources" UI (or API)
4. Trigger a feed refresh → Chelsea tab populates
5. Add a match via the Schedule tab form → appears in Upcoming
6. PATCH the match result → moves to Results section
7. Switch to Highlights tab → confirm YouTube RSS items appear
8. Switch to International → England/USA sub-filter works
9. `npm run db:checkpoint && npm run db:export-seeds` → seeds updated
10. Run `/rebuild-image` to refresh Docker seed

---

## Open Questions Resolved

- **Schedule:** Auto-fetch from football-data.org (free tier) with manual override capability
- **Highlights:** Auto-fetch via Chelsea FC YouTube RSS (`channel_id=UCdN2g8KBhCMFXPRgTXz-4sQ`) — items land in news_items tagged `highlights`
- **International:** National teams only — England + USMNT tabs within the International view
- **Sidebar label:** "Chelsea FC"
