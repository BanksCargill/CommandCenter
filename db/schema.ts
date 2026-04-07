import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const memories = sqliteTable("memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  tags: text("tags"), // comma-separated
  source: text("source"), // e.g. "claude", "manual", "import"
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const feedSources = sqliteTable("feed_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type", { enum: ["rss", "api"] }).notNull().default("rss"),
  adapter: text("adapter"), // "hn-algolia" | "reddit" | "devto" | "lobsters" | null (null = use rss parser)
  topicTags: text("topic_tags"), // comma-separated topics this source covers
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const newsItems = sqliteTable("news_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  feedSourceId: integer("feed_source_id").references(() => feedSources.id),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  summary: text("summary"),
  score: integer("score"), // engagement score from API sources (points, upvotes, reactions)
  publishedAt: integer("published_at", { mode: "timestamp" }),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
}, (t) => [
  index("idx_news_published").on(t.publishedAt),
  index("idx_news_source").on(t.feedSourceId),
  index("idx_news_fetched").on(t.fetchedAt),
]);

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const projectItems = sqliteTable("project_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  status: text("status", { enum: ["idea", "todo", "done"] }).notNull().default("todo"),
  tags: text("tags"), // comma-separated, e.g. "module,ui,backend"
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  startedAt: integer("started_at", { mode: "timestamp" }),   // first moved to "todo"
  completedAt: integer("completed_at", { mode: "timestamp" }), // moved to "done"
  updatedAt: integer("updated_at", { mode: "timestamp" }),   // any field change
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
}, (t) => [
  index("idx_items_project").on(t.projectId),
]);

export const docs = sqliteTable("docs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  tags: text("tags").notNull().default(""),           // comma-separated
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
}, (t) => [
  index("idx_docs_created").on(t.createdAt),
  index("idx_docs_pinned").on(t.pinned),
]);

export const chelseaMatches = sqliteTable("chelsea_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  team: text("team").notNull().default("chelsea"), // "chelsea" | "england" | "usa" | "world_cup"
  externalId: text("external_id").unique(), // football-data.org match ID for dedup
  matchDate: integer("match_date", { mode: "timestamp" }).notNull(),
  opponent: text("opponent").notNull(),
  competition: text("competition").notNull(), // "Premier League" | "Champions League" | etc.
  venue: text("venue", { enum: ["home", "away", "neutral"] }).notNull().default("home"),
  result: text("result", { enum: ["win", "draw", "loss", "upcoming"] }).notNull().default("upcoming"),
  score: text("score"), // "2-1", null if upcoming
  notes: text("notes"),
}, (t) => [
  index("idx_chelsea_date").on(t.matchDate),
  index("idx_chelsea_team").on(t.team),
]);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type FeedSource = typeof feedSources.$inferSelect;
export type NewFeedSource = typeof feedSources.$inferInsert;
export type NewsItem = typeof newsItems.$inferSelect;
export type NewNewsItem = typeof newsItems.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectItem = typeof projectItems.$inferSelect;
export type NewProjectItem = typeof projectItems.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type Doc = typeof docs.$inferSelect;
export type NewDoc = typeof docs.$inferInsert;
export type ChelseaMatch = typeof chelseaMatches.$inferSelect;
export type NewChelseaMatch = typeof chelseaMatches.$inferInsert;
