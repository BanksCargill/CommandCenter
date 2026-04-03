import { db } from "@/lib/db";
import { newsItems, feedSources } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import NewsFeed from "@/app/components/NewsFeed";
import FeedSources from "@/app/components/FeedSources";
import { getSettingBool, getSettingInt } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function Page() {
  const digestSize = getSettingInt("digest_size");
  const digestDefaultOn = getSettingBool("digest_default_on");
  const sources = db.select().from(feedSources).all();

  const items = db
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
    .orderBy(desc(newsItems.publishedAt))
    .limit(500)
    .all();

  return (
    <div className="flex h-full">
      <NewsFeed initialItems={items} sources={sources} digestSize={digestSize} digestDefaultOn={digestDefaultOn} />
      <FeedSources initialSources={sources} />
    </div>
  );
}
