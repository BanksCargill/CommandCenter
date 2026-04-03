import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "db", "command-center.db"));
const now = Math.floor(Date.now() / 1000);

// ── CommandCenter project (id=1) ──────────────────────────────────────────────
// Move "Multi-project support" to done if it exists
const multiProject = db.prepare(`
  SELECT id FROM project_items
  WHERE project_id = 1 AND title LIKE '%Multi-project%'
  LIMIT 1
`).get() as { id: number } | undefined;

if (multiProject) {
  db.prepare(`
    UPDATE project_items
    SET status = 'done', completed_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, multiProject.id);
  console.log(`Moved "Multi-project support" → done (id=${multiProject.id})`);
}

// Add the new items that were just built, skip if already present
const existingTitles = new Set(
  (db.prepare(`SELECT title FROM project_items WHERE project_id = 1`).all() as { title: string }[])
    .map((r) => r.title)
);

const newDoneItems = [
  { title: "Projects landing page with project cards", notes: "Shows all projects with idea/todo/done counts. Click to navigate into a project.", tags: "ui,frontend" },
  { title: "Create / archive / delete projects", notes: "New project form on landing page. Archive (soft-hide) or hard-delete with cascade. Archived projects shown in separate toggle.", tags: "ui,backend" },
  { title: "Per-project URL routing (/projects/[id])", notes: "Each project has its own URL. Back-arrow returns to landing page.", tags: "frontend,routing" },
];

const newTodoItems = [
  { title: "Project rename inline on board", notes: "Click the project title on the board to edit it in-place and save via PATCH.", tags: "ui" },
  { title: "Sort projects by last activity", notes: "Landing page currently sorts by created date. Sort by most recently updated item would be more useful.", tags: "ui,backend" },
];

const newIdeaItems = [
  { title: "Project colour / emoji label", notes: "Let users assign a colour or emoji to each project card for quick visual identification.", tags: "ui" },
  { title: "Project-level progress bar", notes: "Show done/(todo+done) ratio as a thin progress strip on each landing card.", tags: "ui" },
  { title: "Duplicate project (template)", notes: "Copy a project's structure (columns, tags) without its items — useful for repeating workflows.", tags: "feature" },
];

const insertItem = db.prepare(`
  INSERT INTO project_items (project_id, title, notes, status, tags, sort_order, started_at, completed_at, created_at)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let idx = 0;
for (const item of newDoneItems) {
  if (!existingTitles.has(item.title)) {
    insertItem.run(item.title, item.notes, "done", item.tags, idx++, now, now, now);
    console.log(`Added done: ${item.title}`);
  }
}
for (const item of newTodoItems) {
  if (!existingTitles.has(item.title)) {
    insertItem.run(item.title, item.notes, "todo", item.tags, idx++, now, null, now);
    console.log(`Added todo: ${item.title}`);
  }
}
for (const item of newIdeaItems) {
  if (!existingTitles.has(item.title)) {
    insertItem.run(item.title, item.notes, "idea", item.tags, idx++, null, null, now);
    console.log(`Added idea: ${item.title}`);
  }
}

// ── Settings project (id=2) ───────────────────────────────────────────────────
// Move toast/refresh items to done since those are deferred; add new ideas
const settingsTitles = new Set(
  (db.prepare(`SELECT title FROM project_items WHERE project_id = 2`).all() as { title: string }[])
    .map((r) => r.title)
);

const settingsNewIdeas = [
  { title: "News feed hot-reload after purge", notes: "Purging news in Settings currently requires a page reload to see the empty feed. SWR or a router.refresh() call would fix this.", tags: "ui,frontend" },
];

let si = 100;
for (const item of settingsNewIdeas) {
  if (!settingsTitles.has(item.title)) {
    db.prepare(`
      INSERT INTO project_items (project_id, title, notes, status, tags, sort_order, created_at)
      VALUES (2, ?, ?, 'idea', ?, ?, ?)
    `).run(item.title, item.notes, item.tags, si++, now);
    console.log(`Settings — added idea: ${item.title}`);
  }
}

db.close();
console.log("Done.");
