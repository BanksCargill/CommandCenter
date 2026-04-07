import { db } from "@/lib/db";
import { newsItems, feedSources, chelseaMatches } from "@/db/schema";
import { desc, asc, inArray, eq } from "drizzle-orm";
import { getSettingInt, getSettingBool } from "@/lib/settings";
import ChelseaLanding from "@/app/components/ChelseaLanding";

// Cached; invalidated by revalidatePath in API routes on any mutation or sync.
export const revalidate = false;

function hasTopicTag(topicTags: string | null | undefined, tag: string): boolean {
  return (topicTags ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .includes(tag);
}

export default function ChelseaPage() {
  const digestSize = getSettingInt("digest_size");
  const digestDefaultOn = getSettingBool("digest_default_on");

  const allSources = db.select().from(feedSources).all();

  // Sources filtered per tab topic
  const chelseaNewsSources = allSources.filter((s) => hasTopicTag(s.topicTags, "chelsea"));
  const englandSources = allSources.filter((s) => hasTopicTag(s.topicTags, "england"));
  const usaSources = allSources.filter((s) => hasTopicTag(s.topicTags, "usa"));

  // All chelsea-related source IDs for the news query
  const chelseaRelatedIds = allSources
    .filter((s) => {
      const tags = (s.topicTags ?? "").split(",").map((t) => t.trim().toLowerCase());
      return tags.some((t) => ["chelsea", "highlights", "england", "usa"].includes(t));
    })
    .map((s) => s.id);

  const news =
    chelseaRelatedIds.length > 0
      ? db
          .select({
            id: newsItems.id,
            title: newsItems.title,
            url: newsItems.url,
            summary: newsItems.summary,
            score: newsItems.score,
            publishedAt: newsItems.publishedAt,
            feedSourceId: newsItems.feedSourceId,
            sourceName: feedSources.name,
            sourceTopicTags: feedSources.topicTags,
          })
          .from(newsItems)
          .leftJoin(feedSources, eq(newsItems.feedSourceId, feedSources.id))
          .where(inArray(newsItems.feedSourceId, chelseaRelatedIds))
          .orderBy(desc(newsItems.publishedAt))
          .limit(200)
          .all()
      : [];

  const chelseaMatchData = db
    .select()
    .from(chelseaMatches)
    .where(eq(chelseaMatches.team, "chelsea"))
    .orderBy(asc(chelseaMatches.matchDate))
    .all();

  const uclMatchData = db
    .select()
    .from(chelseaMatches)
    .where(eq(chelseaMatches.team, "ucl"))
    .orderBy(asc(chelseaMatches.matchDate))
    .all();

  const worldCupMatchData = db
    .select()
    .from(chelseaMatches)
    .where(eq(chelseaMatches.team, "world_cup"))
    .orderBy(asc(chelseaMatches.matchDate))
    .all();

  return (
    <ChelseaLanding
      initialNews={news}
      chelseaNewsSources={chelseaNewsSources}
      englandSources={englandSources}
      usaSources={usaSources}
      chelseaMatches={chelseaMatchData}
      uclMatches={uclMatchData}
      worldCupMatches={worldCupMatchData}
      digestSize={digestSize}
      digestDefaultOn={digestDefaultOn}
    />
  );
}
