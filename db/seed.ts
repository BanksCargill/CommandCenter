import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { feedSources, newsItems } from "./schema";
import { eq } from "drizzle-orm";
import path from "path";

const sqlite = new Database(path.join(process.cwd(), "db", "command-center.db"));
const db = drizzle(sqlite);

// URLs to remove (replaced with better alternatives)
const staleUrls = [
  "https://www.sciencedaily.com/rss/matter_energy/fluid_dynamics.xml",
  "https://www.therundown.ai/feed",
  "https://technews.acm.org/rss.xml",
  "https://news.ycombinator.com/rss", // replaced by HN Algolia API
];

for (const url of staleUrls) {
  const source = db.select().from(feedSources).where(eq(feedSources.url, url)).get();
  if (source) {
    db.delete(newsItems).where(eq(newsItems.feedSourceId, source.id)).run();
    db.delete(feedSources).where(eq(feedSources.id, source.id)).run();
    console.log(`✗ Removed stale feed: ${source.name}`);
  }
}

const seeds: Array<{
  name: string;
  url: string;
  type: "rss" | "api";
  adapter?: string;
  topicTags: string;
  active: boolean;
}> = [
  // ── API sources ───────────────────────────────────────────────────────────
  {
    // HN front page ranked by votes — replaces HN RSS
    name: "Hacker News",
    url: "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30",
    type: "api",
    adapter: "hn-algolia",
    topicTags: "tech",
    active: true,
  },
  {
    // Fluid dynamics discussion, papers, job posts — niche but high signal
    name: "r/CFD",
    url: "https://www.reddit.com/r/CFD/hot.json?limit=25",
    type: "api",
    adapter: "reddit",
    topicTags: "cfd,fluid-dynamics",
    active: true,
  },
  {
    // General programming — broad dev community
    name: "r/programming",
    url: "https://www.reddit.com/r/programming/hot.json?limit=25",
    type: "api",
    adapter: "reddit",
    topicTags: "programming,tech",
    active: true,
  },
  {
    // Top dev articles this week by reactions
    name: "DEV.to",
    url: "https://dev.to/api/articles?top=7&per_page=20",
    type: "api",
    adapter: "devto",
    topicTags: "dev,programming",
    active: true,
  },
  {
    // Curated tech links, scored by community — higher signal than HN
    name: "Lobsters",
    url: "https://lobste.rs/hottest.json",
    type: "api",
    adapter: "lobsters",
    topicTags: "tech,programming",
    active: true,
  },
  // ── RSS sources ───────────────────────────────────────────────────────────
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    type: "rss",
    topicTags: "tech,science",
    active: true,
  },
  {
    // GPU computing, CUDA, AI, HPC — directly relevant to CFD acceleration
    name: "NVIDIA Developer Blog",
    url: "https://developer.nvidia.com/blog/feed/",
    type: "rss",
    topicTags: "gpu,hpc,simulation",
    active: true,
  },
  {
    // VTK and ParaView — standard CFD scientific visualization stack
    name: "Kitware Blog",
    url: "https://www.kitware.com/feed/",
    type: "rss",
    topicTags: "visualization,vtk,paraview",
    active: true,
  },
  {
    name: "The Register",
    url: "https://www.theregister.com/headlines.atom",
    type: "rss",
    topicTags: "tech,engineering",
    active: true,
  },
];

for (const seed of seeds) {
  const existing = db.select().from(feedSources).where(eq(feedSources.url, seed.url)).all();
  if (existing.length === 0) {
    db.insert(feedSources).values(seed).run();
    console.log(`✓ Seeded: ${seed.name}`);
  } else {
    console.log(`— Skipped (exists): ${seed.name}`);
  }
}

sqlite.close();
console.log("Seed complete.");
