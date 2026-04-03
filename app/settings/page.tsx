// force-dynamic: settings and stats are live — no caching
export const dynamic = "force-dynamic";

import { getAllSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { newsItems, feedSources } from "@/db/schema";
import { max, count } from "drizzle-orm";
import { statSync } from "fs";
import path from "path";
import SettingsLanding from "@/app/components/SettingsLanding";

export default function SettingsPage() {
  const initialSettings = getAllSettings();

  // Total item count
  const totalRow = db.select({ total: count() }).from(newsItems).get();
  const totalItems = totalRow?.total ?? 0;

  // Per-source stats via single GROUP BY query
  const grouped = db
    .select({
      feedSourceId: newsItems.feedSourceId,
      itemCount: count(),
      lastFetchedAt: max(newsItems.fetchedAt),
    })
    .from(newsItems)
    .groupBy(newsItems.feedSourceId)
    .all();

  const statsBySourceId = new Map(grouped.map((r) => [r.feedSourceId, r]));

  const sources = db.select().from(feedSources).all();
  const sourceStats = sources.map((s) => {
    const row = statsBySourceId.get(s.id);
    return {
      id: s.id,
      name: s.name,
      active: s.active,
      itemCount: row?.itemCount ?? 0,
      lastFetchedAt: row?.lastFetchedAt ?? null,
    };
  });

  // DB file size
  let dbSizeBytes = 0;
  try {
    const dbPath = path.join(process.cwd(), "db", "command-center.db");
    dbSizeBytes = statSync(dbPath).size;
  } catch {
    // ignore
  }

  const initialStats = { totalItems, sources: sourceStats, dbSizeBytes };

  return <SettingsLanding initialSettings={initialSettings} initialStats={initialStats} />;
}
