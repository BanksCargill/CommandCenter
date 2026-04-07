# Plan: Chelsea Module Feed Improvements

## Context
The Chelsea module shows news from feeds tagged `chelsea`, `highlights`, `england`, `usa`. Currently the news tabs display a flat list with no way to refresh feeds from the Chelsea page, no per-source grouping, and no digest toggle. The Highlights tab appears empty likely because the Chelsea FC YouTube RSS feed hasn't been fetched recently (it's the only source tagged `highlights`). This plan adds a refresh button, per-source filtering + Top N digest, and confirms/fixes the highlights feed issue.

---

## Changes

### 1. Refresh Feeds Button
**File:** `app/components/ChelseaLanding.tsx`

Add a "Refresh Feeds" button (with a `RefreshCw` icon from lucide-react) that POSTs to `/api/feeds/refresh` â€” the same endpoint the News Feed module uses. 

- Place it in the tab bar header area (top right, alongside the existing tab buttons)
- Show a loading spinner while in-flight
- On success, call a passed-in `onRefresh` callback that re-fetches `initialNews` â€” OR since this is a server-rendered page, use `router.refresh()` from `next/navigation` to re-run the server component and get fresh `initialNews` props. Use `router.refresh()` â€” it's simpler and consistent with the architecture.
- Show a brief success toast or inline count message (e.g. "12 new items") using the returned `{ added }` value from the API.

### 2. Per-Source Filtering + Top N Digest Toggle
**File:** `app/components/ChelseaLanding.tsx`

Replicate the pattern from `app/components/NewsFeed.tsx`:

**Source filter buttons** (shown below the tabs, above the news list):
- "All" button + one button per unique `feedSourceId` among the filtered items for the current tab
- Filtering is purely client-side â€” already have `filteredNews` per tab, just add a second filter pass

**Top N digest toggle**:
- Button labeled `Top {digestSize}` (same label as NewsFeed) with `Layers` icon
- When enabled, call the same `applyDigest()` logic:
  1. Group items by `feedSourceId`
  2. For each group: sort by score desc (if scores exist), else keep date order; take first N
  3. Merge and re-sort by `publishedAt DESC`
- Read `digestSize` from the `settings` prop â€” `app/chelsea/page.tsx` already has access to settings via `lib/settings.ts`; pass `digestSize` as a prop to `ChelseaLanding`

**Where to show these controls:**
- Only on tabs that show news items (Chelsea, Highlights, International) â€” NOT on Schedule tab

**Implementation steps:**
1. Add `digestSize: number` prop to `ChelseaLanding`
2. Add `app/chelsea/page.tsx` to read `getSettingInt("digest_size")` and pass it as prop
3. Add `selectedSource: string | null` + `digestEnabled: boolean` state
4. Compute `displayedNews` = `applyDigest(filterBySource(filteredNews))`
5. Render source buttons + digest toggle button above the list (hidden when tab === "schedule")

### 3. Highlights Feed Investigation
**Root cause:** The Highlights tab filters by `highlights` topic_tag. Only one feed source has this tag: **Chelsea FC YouTube** (`youtube.com/feeds/videos.xml?channel_id=...`). If this RSS feed hasn't been refreshed or the YouTube RSS URL is stale/incorrect, no items will show.

**Fix:** After implementing the refresh button (item 1), the user can refresh directly from the Chelsea page. The highlights tab should populate once the YouTube RSS feed returns items. No code change needed for the tab logic â€” it's correctly wired.

**To verify:** After refresh, check `news_items` for items with `feedSourceId` matching the YouTube source. If still empty, the YouTube RSS URL may be broken â€” check `db/seed.ts` for the correct channel ID URL.

---

## Critical Files

| File | Change |
|------|--------|
| `app/components/ChelseaLanding.tsx` | Add refresh button, source filter buttons, digest toggle, `digestSize` prop |
| `app/chelsea/page.tsx` | Read `digestSize` setting, pass as prop |

**Reference (read-only, for patterns to copy):**
- `app/components/NewsFeed.tsx` â€” `applyDigest()` function, source button rendering, digest toggle UI
- `app/api/feeds/refresh/route.ts` â€” confirm POST endpoint shape and response `{ added }`

---

## Upload to Docs
After implementation, POST this plan to `/api/docs`:
- `title`: "Plan: Chelsea FC Feed Improvements"
- `tags`: `planning,chelsea`
- `projectId`: 1
- `content`: contents of this file

---

## Verification
1. Navigate to `/chelsea`
2. Click "Refresh Feeds" â€” confirm spinner appears, then success message with item count
3. Switch to Chelsea tab â€” confirm source filter buttons appear (BBC Sport, r/chelseafc, YouTube)
4. Click a source button â€” confirm only that source's items show
5. Click "Top 5" digest toggle â€” confirm list collapses to top 5 per source
6. Switch to Highlights tab â€” confirm YouTube items appear after refresh
7. Switch to Schedule tab â€” confirm no source/digest controls appear there
