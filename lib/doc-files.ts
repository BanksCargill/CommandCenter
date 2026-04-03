/**
 * Server-side helper: write a doc's content to docs/<id>-<slug>.md on disk.
 * Called from API routes after every create/update so files stay current.
 * Only runs in Node.js (not Edge runtime).
 */

import fs from "fs";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "docs");

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Remove any existing file for this id (handles slug/title changes) */
function removeStaleFile(id: number, currentTitle: string): void {
  if (!fs.existsSync(DOCS_DIR)) return;
  const targetSlug = `${id}-${slugify(currentTitle)}.md`;
  for (const f of fs.readdirSync(DOCS_DIR)) {
    if (f.startsWith(`${id}-`) && f.endsWith(".md") && f !== targetSlug) {
      fs.unlinkSync(path.join(DOCS_DIR, f));
    }
  }
}

export function writeDocFile(id: number, title: string, content: string): void {
  try {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    removeStaleFile(id, title);
    const filePath = path.join(DOCS_DIR, `${id}-${slugify(title)}.md`);
    fs.writeFileSync(filePath, content, "utf8");
  } catch {
    // File write failures should not break the API response
  }
}

/**
 * If the local file is newer than updatedAt, push its content to the DB.
 * Returns the updated content string if a push happened, null otherwise.
 */
export function syncFromFileIfNewer(
  id: number,
  updatedAt: Date,
  updateFn: (content: string) => void
): string | null {
  try {
    if (!fs.existsSync(DOCS_DIR)) return null;
    const match = fs.readdirSync(DOCS_DIR).find((f) => f.startsWith(`${id}-`) && f.endsWith(".md"));
    if (!match) return null;
    const filePath = path.join(DOCS_DIR, match);
    const fileMtime = fs.statSync(filePath).mtime;
    if (fileMtime <= updatedAt) return null;
    const content = fs.readFileSync(filePath, "utf8");
    updateFn(content);
    return content;
  } catch {
    return null;
  }
}

export function deleteDocFile(id: number): void {
  try {
    if (!fs.existsSync(DOCS_DIR)) return;
    for (const f of fs.readdirSync(DOCS_DIR)) {
      if (f.startsWith(`${id}-`) && f.endsWith(".md")) {
        fs.unlinkSync(path.join(DOCS_DIR, f));
      }
    }
  } catch {
    // ignore
  }
}
