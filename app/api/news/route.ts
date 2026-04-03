import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsItems, feedSources } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const sourceId = searchParams.get("source")
    ? parseInt(searchParams.get("source")!)
    : null;

  const query = db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      url: newsItems.url,
      summary: newsItems.summary,
      publishedAt: newsItems.publishedAt,
      fetchedAt: newsItems.fetchedAt,
      feedSourceId: newsItems.feedSourceId,
      sourceName: feedSources.name,
    })
    .from(newsItems)
    .leftJoin(feedSources, eq(newsItems.feedSourceId, feedSources.id))
    .orderBy(desc(newsItems.publishedAt));

  const results = sourceId
    ? query.where(eq(newsItems.feedSourceId, sourceId)).limit(limit).all()
    : query.limit(limit).all();

  return NextResponse.json(results);
}
