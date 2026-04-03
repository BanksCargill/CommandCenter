import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { projects, projectItems } from "./schema";
import { eq } from "drizzle-orm";
import path from "path";

const sqlite = new Database(path.join(process.cwd(), "db", "command-center.db"));
const db = drizzle(sqlite);

// Create the Command Center project if it doesn't exist
let project = db.select().from(projects).where(eq(projects.name, "Command Center")).get();
if (!project) {
  project = db
    .insert(projects)
    .values({
      name: "Command Center",
      description: "Personal command center — news feed, memories, and project tracking.",
    })
    .returning()
    .get();
  console.log("✓ Created project: Command Center");
} else {
  console.log("— Project exists: Command Center");
}

const pid = project.id;

const done: { title: string; notes: string }[] = [
  { title: "Next.js 15 scaffold — TypeScript, Tailwind, App Router", notes: "Bootstrapped with create-next-app@15 to avoid the React Compiler prompt in v16. App Router with TypeScript strict mode and Tailwind v4." },
  { title: "SQLite + Drizzle ORM with migrations", notes: "better-sqlite3 for synchronous SQLite access. Drizzle Kit manages schema migrations — run `npx drizzle-kit generate && npx drizzle-kit migrate` after schema changes." },
  { title: "Dockerfile + docker-compose.yml", notes: "Multi-stage Docker build. SQLite DB mounted as a volume at /app/db so data persists across container restarts." },
  { title: "RSS news feed with node-cron (every 3h)", notes: "node-cron scheduled in instrumentation.ts, which Next.js runs once on server startup. Guard on NEXT_RUNTIME === 'nodejs' prevents Edge runtime execution." },
  { title: "HN Algolia, Reddit, DEV.to, Lobsters API integrations", notes: "Adapter pattern in lib/fetcher.ts — feedSources.adapter field routes to the correct fetcher. All adapters normalise to the same newsItems schema including an engagement score." },
  { title: "Feed source management — add, toggle, delete", notes: "FeedSources panel in the right sidebar. Toggle pauses fetching without deleting history. Delete removes the source and cascades to its news items." },
  { title: "Top 5 digest mode with score-based ranking", notes: "Groups news items by source, sorts each group by score desc (falls back to date for RSS), takes top N per source, then re-sorts merged result by date. Toggle always visible regardless of source filter." },
  { title: "Engagement score display (▲ points)", notes: "Score shown in amber next to article title for API sources (HN, Reddit, DEV.to, Lobsters). Formatted with k-suffix for ≥1000. Hidden for RSS sources where score is null." },
  { title: "Projects board with drag-and-drop", notes: "Three-column Kanban (Ideas / To Do / Done) using @dnd-kit/core. Dragging a card between columns PATCHes status immediately. Per-column add forms, inline title/notes editing, tags, and archive." },
];

const todo = [
  { title: "Memories module", notes: "Capture UI, tagging, search. Core concept from original plan.", tags: "module,ui,backend" },
  { title: "Docker end-to-end verification", notes: "Confirm docker compose up --build works clean on fresh machine.", tags: "devops" },
  { title: "Sort by score", notes: "Option to sort feed by engagement score instead of date.", tags: "ui,news-feed" },
];

const ideas = [
  { title: "Claude API integration", notes: "Auto-capture memories from Claude conversations via API hooks.", tags: "module,ai,api" },
  { title: "Keyword filtering", notes: "Filter news feed by keyword/topic across all sources.", tags: "news-feed,ui" },
  { title: "Calendar module", notes: "Integrate with Google Calendar or iCal for schedule visibility.", tags: "module,api" },
  { title: "Full-text search", notes: "Search across news items, memories, and project notes.", tags: "backend,ui" },
  { title: "Alert on high-score items", notes: "Notify when an article exceeds a score threshold (e.g. HN > 500).", tags: "news-feed,notifications" },
  { title: "Export memories to Markdown", notes: "Download all memories as .md files for portability.", tags: "memories,export" },
  { title: "r/FluidMechanics feed", notes: "Add as a Reddit source alongside r/CFD.", tags: "news-feed,science" },
  { title: "SimScale blog feed", notes: "CFD simulation industry news — simscale.com/blog/feed/", tags: "news-feed,science" },
  { title: "Multi-project support", notes: "Extend projects board to support multiple projects with a switcher.", tags: "module,projects,ui" },
];

// Get existing item titles to avoid duplicates
const existing = db.select().from(projectItems).where(eq(projectItems.projectId, pid)).all();
const existingTitles = new Set(existing.map((i) => i.title));

let order = existing.length;

function seed(title: string, status: "done" | "todo" | "idea", notes?: string, tags?: string) {
  if (existingTitles.has(title)) {
    // Update notes/tags even if it exists
    db.update(projectItems)
      .set({ notes: notes ?? null, tags: tags ?? null })
      .where(eq(projectItems.title, title))
      .run();
    console.log(`  ↺ Updated: ${title}`);
    return;
  }
  db.insert(projectItems).values({ projectId: pid, title, notes: notes ?? null, tags: tags ?? null, status, sortOrder: order++ }).run();
  console.log(`  ✓ ${status.padEnd(4)} ${title}`);
}

console.log("\nSeeding done items…");
done.forEach(({ title, notes }) => seed(title, "done", notes));

console.log("\nSeeding to-do items…");
todo.forEach(({ title, notes, tags }) => seed(title, "todo", notes, tags));

console.log("\nSeeding idea items…");
ideas.forEach(({ title, notes, tags }) => seed(title, "idea", notes, tags));

sqlite.close();
console.log("\nProject seed complete.");
