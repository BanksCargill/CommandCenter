import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsItems } from "@/db/schema";
import { lt } from "drizzle-orm";

// POST /api/settings/purge
// body: { mode: "retention" | "all", retentionDays?: number }
export async function POST(req: Request) {
  const body = await req.json() as { mode: "retention" | "all"; retentionDays?: number };

  let deleted = 0;

  if (body.mode === "all") {
    const result = db.delete(newsItems).run();
    deleted = result.changes;
  } else {
    const days = body.retentionDays ?? 30;
    if (days <= 0) {
      return NextResponse.json({ deleted: 0, message: "Retention is set to keep forever" });
    }
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = db.delete(newsItems).where(lt(newsItems.fetchedAt, cutoff)).run();
    deleted = result.changes;
  }

  return NextResponse.json({ deleted });
}
