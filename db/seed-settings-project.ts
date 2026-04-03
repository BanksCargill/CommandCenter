import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "db", "command-center.db");
const db = new Database(dbPath);

const now = Math.floor(Date.now() / 1000);

// Check for existing "Settings" project
let project = db.prepare(`SELECT id FROM projects WHERE name = 'Settings'`).get() as { id: number } | undefined;

if (!project) {
  const result = db
    .prepare(`INSERT INTO projects (name, description, created_at) VALUES (?, ?, ?)`)
    .run("Settings", "Behaviour, data hygiene, and observability controls", now);
  project = { id: result.lastInsertRowid as number };
  console.log(`Created project: Settings (id=${project.id})`);
} else {
  console.log(`Using existing project: Settings (id=${project.id})`);
}

const pid = project.id;

// Clear existing items for idempotency
db.prepare(`DELETE FROM project_items WHERE project_id = ?`).run(pid);

const insert = db.prepare(`
  INSERT INTO project_items (project_id, title, notes, status, tags, sort_order, started_at, completed_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const items: Array<{
  title: string;
  notes: string;
  status: "idea" | "todo" | "done";
  tags: string;
  order: number;
  startedAt?: number;
  completedAt?: number;
}> = [
  // Done
  {
    title: "Add settings table to DB schema",
    notes: "key/value store with updatedAt timestamp. Migration generated via drizzle-kit.",
    status: "done", tags: "backend,db", order: 0,
    startedAt: now, completedAt: now,
  },
  {
    title: "Create lib/settings.ts helper",
    notes: "getSetting, getSettingInt, getSettingBool, setSetting, getAllSettings with defaults.",
    status: "done", tags: "backend", order: 1,
    startedAt: now, completedAt: now,
  },
  {
    title: "Settings API routes",
    notes: "GET/PUT /api/settings, GET /api/settings/stats, POST /api/settings/purge",
    status: "done", tags: "backend,api", order: 2,
    startedAt: now, completedAt: now,
  },
  {
    title: "Dynamic fetch interval via cron",
    notes: "Cron now checks every hour and respects fetch_interval_hours setting. Tracks last_fetched_at. Auto-purges on schedule.",
    status: "done", tags: "backend,cron", order: 3,
    startedAt: now, completedAt: now,
  },
  {
    title: "Settings page UI",
    notes: "Feed behaviour (interval, digest size, digest default). Data hygiene (retention, purge now, clear all). DB stats table per source.",
    status: "done", tags: "ui,frontend", order: 4,
    startedAt: now, completedAt: now,
  },
  {
    title: "Wire digestSize & digestDefaultOn from settings into NewsFeed",
    notes: "page.tsx reads from DB and passes as props. NewsFeed uses them as initial state.",
    status: "done", tags: "frontend", order: 5,
    startedAt: now, completedAt: now,
  },

  // Todo (in progress / next up)
  {
    title: "Toast notifications on save",
    notes: "Currently shows inline icon indicators. A small toast system would be cleaner.",
    status: "todo", tags: "ui", order: 0,
    startedAt: now,
  },
  {
    title: "Refresh news feed after clear/purge without full page reload",
    notes: "After purge, the news feed still shows stale data until the user navigates away.",
    status: "todo", tags: "ui,frontend", order: 1,
    startedAt: now,
  },

  // Ideas
  {
    title: "Manual feed refresh button with status indicator",
    notes: "Show last-refresh time next to each source in the stats table, with a per-source refresh button.",
    status: "idea", tags: "ui,feeds", order: 0,
  },
  {
    title: "Export / import settings as JSON",
    notes: "Useful when moving between machines or resetting the DB.",
    status: "idea", tags: "data", order: 1,
  },
  {
    title: "Per-source retention override",
    notes: "Some sources (HN, Reddit) generate lots of items; keep them for fewer days than RSS feeds.",
    status: "idea", tags: "feeds,data", order: 2,
  },
  {
    title: "Dark/light theme toggle",
    notes: "App is currently hardcoded dark. Could expose as a settings option.",
    status: "idea", tags: "ui", order: 3,
  },
];

for (const item of items) {
  insert.run(
    pid,
    item.title,
    item.notes,
    item.status,
    item.tags,
    item.order,
    item.startedAt ?? null,
    item.completedAt ?? null,
    now,
  );
}

console.log(`Inserted ${items.length} project items`);
db.close();
