/**
 * CLI for docs — works without a running server via direct Drizzle access.
 *
 * Usage:
 *   npx tsx scripts/docs.ts get <id>
 *   npx tsx scripts/docs.ts list [--title <pattern>]
 *   npx tsx scripts/docs.ts patch <id> <file>
 *   npx tsx scripts/docs.ts sync [id]
 *   npx tsx scripts/docs.ts push <id>
 */

import { db } from "../lib/db";
import { docs } from "../db/schema";
import { eq, like } from "drizzle-orm";
import fs from "fs";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "docs");

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeDocsPath(...segments: string[]): string {
  const resolved = path.resolve(DOCS_DIR, ...segments);
  const base = path.resolve(DOCS_DIR);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Path traversal attempt blocked: ${resolved}`);
  }
  return resolved;
}

function docFilePath(id: number, title: string): string {
  return safeDocsPath(`${id}-${slugify(title)}.md`);
}

/** Write a doc's content to docs/<id>-<slug>.md */
function writeDocFile(id: number, title: string, content: string): string {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const filePath = docFilePath(id, title);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

/** Find existing file for a given id (handles slug changes) */
function findDocFile(id: number): string | null {
  if (!fs.existsSync(DOCS_DIR)) return null;
  const prefix = `${id}-`;
  const match = fs.readdirSync(DOCS_DIR).find((f) => f.startsWith(prefix) && f.endsWith(".md"));
  return match ? safeDocsPath(match) : null;
}

/** Translate glob pattern (* = any chars) to SQL LIKE pattern (% = any chars) */
function globToLike(pattern: string): string {
  return pattern.replace(/\*/g, "%");
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd) {
    console.log(`Usage:
  npx tsx scripts/docs.ts get <id>
  npx tsx scripts/docs.ts list [--title <pattern>]
  npx tsx scripts/docs.ts patch <id> <file>
  npx tsx scripts/docs.ts sync [id]
  npx tsx scripts/docs.ts push <id>`);
    process.exit(0);
  }

  switch (cmd) {
    case "get": {
      const id = parseInt(args[0]);
      if (!id) { console.error("Usage: get <id>"); process.exit(1); }
      const doc = db.select().from(docs).where(eq(docs.id, id)).get();
      if (!doc) { console.error(`Doc ${id} not found`); process.exit(1); }
      process.stdout.write(doc.content);
      break;
    }

    case "list": {
      let titlePattern: string | undefined;
      const titleIdx = args.indexOf("--title");
      if (titleIdx !== -1) titlePattern = args[titleIdx + 1];

      const query = db.select({
        id: docs.id,
        title: docs.title,
        tags: docs.tags,
        pinned: docs.pinned,
        updatedAt: docs.updatedAt,
      }).from(docs);

      const rows = titlePattern
        ? query.where(like(docs.title, globToLike(titlePattern))).all()
        : query.all();

      if (rows.length === 0) {
        console.log("No docs found.");
        break;
      }

      const idW = 4, pinnedW = 6;
      const titleW = Math.min(50, Math.max(10, ...rows.map((r) => r.title.length)));
      const tagsW = Math.min(30, Math.max(4, ...rows.map((r) => r.tags.length)));

      const pad = (s: string, w: number) => s.slice(0, w).padEnd(w);
      console.log(`${pad("ID", idW)}  ${pad("Title", titleW)}  ${pad("Tags", tagsW)}  ${pad("Pinned", pinnedW)}`);
      console.log(`${"-".repeat(idW)}  ${"-".repeat(titleW)}  ${"-".repeat(tagsW)}  ${"-".repeat(pinnedW)}`);
      for (const r of rows) {
        console.log(`${String(r.id).padEnd(idW)}  ${pad(r.title, titleW)}  ${pad(r.tags, tagsW)}  ${r.pinned ? "yes" : ""}`);
      }
      break;
    }

    case "patch": {
      const id = parseInt(args[0]);
      const file = args[1];
      if (!id || !file) { console.error("Usage: patch <id> <file>"); process.exit(1); }
      if (!fs.existsSync(file)) { console.error(`File not found: ${file}`); process.exit(1); }
      const content = fs.readFileSync(file, "utf8");
      const updated = db
        .update(docs)
        .set({ content, updatedAt: new Date() })
        .where(eq(docs.id, id))
        .returning()
        .get();
      if (!updated) { console.error(`Doc ${id} not found`); process.exit(1); }
      console.log(`Patched doc ${id}: "${updated.title}"`);
      // Keep the file mirror current after a patch
      const synced = writeDocFile(updated.id, updated.title, updated.content);
      console.log(`File updated: ${path.relative(process.cwd(), synced)}`);
      break;
    }

    case "sync": {
      const id = args[0] ? parseInt(args[0]) : undefined;
      const rows = id
        ? db.select().from(docs).where(eq(docs.id, id)).all()
        : db.select().from(docs).all();
      if (rows.length === 0) { console.log("No docs to sync."); break; }
      let written = 0;
      for (const doc of rows) {
        // Remove stale file if title changed (different slug)
        const stale = findDocFile(doc.id);
        const targetPath = docFilePath(doc.id, doc.title);
        if (stale && stale !== targetPath) {
          fs.unlinkSync(stale);
        }
        writeDocFile(doc.id, doc.title, doc.content);
        written++;
      }
      console.log(`Synced ${written} doc(s) to ${path.relative(process.cwd(), DOCS_DIR) || "docs/"}`);
      break;
    }

    case "push": {
      const id = parseInt(args[0]);
      if (!id) { console.error("Usage: push <id>"); process.exit(1); }
      const filePath = findDocFile(id);
      if (!filePath) { console.error(`No file found for doc ${id} in docs/. Run sync first.`); process.exit(1); }
      const content = fs.readFileSync(filePath, "utf8");
      const updated = db
        .update(docs)
        .set({ content, updatedAt: new Date() })
        .where(eq(docs.id, id))
        .returning()
        .get();
      if (!updated) { console.error(`Doc ${id} not found in DB`); process.exit(1); }
      console.log(`Pushed "${path.relative(process.cwd(), filePath)}" → doc ${id}: "${updated.title}"`);
      break;
    }

    case "import": {
      const file = args[0];
      if (!file) { console.error("Usage: import <file.md>"); process.exit(1); }
      if (!fs.existsSync(file)) { console.error(`File not found: ${file}`); process.exit(1); }
      const content = fs.readFileSync(file, "utf8");
      const basename = path.basename(file, ".md");
      // Strip leading <id>- prefix if present (e.g. re-importing a synced file)
      const title = basename.replace(/^\d+-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const { db: importDb } = await import("../lib/db");
      const { docs: docsTable } = await import("../db/schema");
      const created = importDb.insert(docsTable).values({ title, content, tags: "", projectId: null }).returning().get();
      // Write back with proper id-slug name
      writeDocFile(created.id, created.title, created.content);
      console.log(`Imported "${title}" → doc ${created.id} (${path.relative(process.cwd(), docFilePath(created.id, created.title))})`);
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
