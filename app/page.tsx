import { db } from "@/lib/db";
import { newsItems, feedSources } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import NewsFeed from "@/app/components/NewsFeed";
import FeedSources from "@/app/components/FeedSources";
import { getSettingBool, getSettingInt } from "@/lib/settings";

// revalidate=false + revalidatePath in feed API routes enables <Link> prefetch.
// Cache is busted on manual refresh, feed source changes, and Docker startup.
export const revalidate = false;

export default function Page() {
  const digestSize = getSettingInt("digest_size");
  const digestDefaultOn = getSettingBool("digest_default_on");
  const feedLimit = getSettingInt("news_feed_limit");
  const sources = db.select().from(feedSources).all();

  // Distribute feedLimit evenly across active sources so no single high-volume
  // source (e.g. HN with 260 items) crowds out smaller ones.
  const activeSources = sources.filter((s) => s.active);
  const limitPerSource = activeSources.length > 0
    ? Math.max(1, Math.floor(feedLimit / activeSources.length))
    : feedLimit;

  const items = activeSources.flatMap((source) =>
    db
      .select({
        id: newsItems.id,
        title: newsItems.title,
        url: newsItems.url,
        summary: newsItems.summary,
        score: newsItems.score,
        publishedAt: newsItems.publishedAt,
        fetchedAt: newsItems.fetchedAt,
        feedSourceId: newsItems.feedSourceId,
        sourceName: feedSources.name,
      })
      .from(newsItems)
      .leftJoin(feedSources, eq(newsItems.feedSourceId, feedSources.id))
      .where(eq(newsItems.feedSourceId, source.id))
      .orderBy(desc(newsItems.publishedAt))
      .limit(limitPerSource)
      .all()
  ).sort((a, b) => {
    const ta = a.publishedAt ? a.publishedAt.getTime() : 0;
    const tb = b.publishedAt ? b.publishedAt.getTime() : 0;
    return tb - ta;
  });

  return (
    <div className="flex h-full">
      <NewsFeed initialItems={items} sources={sources} digestSize={digestSize} digestDefaultOn={digestDefaultOn} />
      <FeedSources initialSources={sources} />
    </div>
  );
}
