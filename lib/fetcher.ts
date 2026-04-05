import Parser from "rss-parser";
import { db } from "@/lib/db";
import { feedSources, newsItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { FeedSource } from "@/db/schema";
import { safeHref } from "@/lib/url-validator";

function isSafeUrl(url: string): boolean {
  return safeHref(url) !== "#";
}

const UA = "Mozilla/5.0 (compatible; CommandCenter/1.0)";

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": UA,
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
});

// Shared insert — returns true if new, false if duplicate
function insertItem(values: {
  feedSourceId: number;
  title: string;
  url: string;
  summary?: string | null;
  score?: number | null;
  publishedAt?: Date | null;
}): boolean {
  try {
    db.insert(newsItems).values(values).run();
    return true;
  } catch {
    return false;
  }
}

// ── RSS ──────────────────────────────────────────────────────────────────────

async function fetchRSS(source: FeedSource): Promise<number> {
  const feed = await rssParser.parseURL(source.url);
  let added = 0;
  for (const item of feed.items) {
    const url = item.link ?? item.guid;
    if (!url || !item.title || !isSafeUrl(url)) continue;
    const ok = insertItem({
      feedSourceId: source.id,
      title: item.title,
      url,
      summary: (item.contentSnippet ?? item.content ?? "").slice(0, 500) || null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    });
    if (ok) added++;
  }
  return added;
}

// ── Hacker News (Algolia API) ─────────────────────────────────────────────────

async function fetchHNAlgolia(source: FeedSource): Promise<number> {
  const res = await fetch(source.url, { headers: { "User-Agent": UA } });
  const data = await res.json() as { hits: Array<{
    objectID: string; title?: string; story_title?: string;
    url?: string; points: number; created_at: string;
  }> };
  let added = 0;
  for (const hit of data.hits) {
    const title = hit.title ?? hit.story_title;
    const url = hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;
    if (!title || !isSafeUrl(url)) continue;
    const ok = insertItem({
      feedSourceId: source.id,
      title,
      url,
      score: hit.points,
      publishedAt: new Date(hit.created_at),
    });
    if (ok) added++;
  }
  return added;
}

// ── Reddit ────────────────────────────────────────────────────────────────────

async function fetchReddit(source: FeedSource): Promise<number> {
  const res = await fetch(source.url, {
    headers: { "User-Agent": UA, "Accept": "application/json" },
  });
  const data = await res.json() as { data: { children: Array<{ data: {
    title: string; url: string; score: number; selftext: string;
    created_utc: number; is_self: boolean; permalink: string;
  } }> } };
  let added = 0;
  for (const child of data.data.children) {
    const post = child.data;
    const url = post.is_self
      ? `https://www.reddit.com${post.permalink}`
      : post.url;
    if (!isSafeUrl(url)) continue;
    const ok = insertItem({
      feedSourceId: source.id,
      title: post.title,
      url,
      summary: post.selftext ? post.selftext.slice(0, 500) : null,
      score: post.score,
      publishedAt: new Date(post.created_utc * 1000),
    });
    if (ok) added++;
  }
  return added;
}

// ── DEV.to ────────────────────────────────────────────────────────────────────

async function fetchDevTo(source: FeedSource): Promise<number> {
  const res = await fetch(source.url, { headers: { "User-Agent": UA } });
  const articles = await res.json() as Array<{
    title: string; url: string; description: string;
    positive_reactions_count: number; published_at: string;
  }>;
  let added = 0;
  for (const article of articles) {
    if (!isSafeUrl(article.url)) continue;
    const ok = insertItem({
      feedSourceId: source.id,
      title: article.title,
      url: article.url,
      summary: article.description ?? null,
      score: article.positive_reactions_count,
      publishedAt: new Date(article.published_at),
    });
    if (ok) added++;
  }
  return added;
}

// ── Lobsters ──────────────────────────────────────────────────────────────────

async function fetchLobsters(source: FeedSource): Promise<number> {
  const res = await fetch(source.url, { headers: { "User-Agent": UA } });
  const stories = await res.json() as Array<{
    short_id: string; title: string; url: string;
    score: number; description: string; created_at: string;
  }>;
  let added = 0;
  for (const story of stories) {
    const url = story.url || `https://lobste.rs/s/${story.short_id}`;
    if (!isSafeUrl(url)) continue;
    const ok = insertItem({
      feedSourceId: source.id,
      title: story.title,
      url,
      summary: story.description ? story.description.slice(0, 500) : null,
      score: story.score,
      publishedAt: new Date(story.created_at),
    });
    if (ok) added++;
  }
  return added;
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function fetchFeed(source: FeedSource): Promise<number> {
  switch (source.adapter) {
    case "hn-algolia": return fetchHNAlgolia(source);
    case "reddit":     return fetchReddit(source);
    case "devto":      return fetchDevTo(source);
    case "lobsters":   return fetchLobsters(source);
    default:           return fetchRSS(source);
  }
}

export async function fetchAllFeeds(): Promise<number> {
  const sources = db.select().from(feedSources).where(eq(feedSources.active, true)).all();
  const CONCURRENCY = 4;
  let total = 0;

  for (let i = 0; i < sources.length; i += CONCURRENCY) {
    const batch = sources.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((s) => fetchFeed(s).then((n) => ({ source: s, count: n })))
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        total += result.value.count;
        console.log(`[feed] ${result.value.source.name}: +${result.value.count} items`);
      } else {
        console.error(`[feed] fetch failed —`, result.reason);
      }
    }
  }

  return total;
}
