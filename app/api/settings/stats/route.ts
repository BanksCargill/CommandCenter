import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsItems, feedSources } from "@/db/schema";
import { max, count } from "drizzle-orm";
import { statSync } from "fs";
import path from "path";

export function GET() {
  // Total item count
  const totalRow = db.select({ total: count() }).from(newsItems).get();
  const totalItems = totalRow?.total ?? 0;

  // Single GROUP BY query instead of N+1 per-source queries
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

  return NextResponse.json({ totalItems, sources: sourceStats, dbSizeBytes });
}
