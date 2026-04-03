# Plan: Docs Module

## Context
The user needs a Docs module to store and browse markdown documents generated during development. It should support full markdown rendering, tagging, project association, pinning, updated timestamps, and file upload — with client-side search filtering.

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/api/docs/route.ts` | GET list + POST create |
| `app/api/docs/[id]/route.ts` | PATCH update + DELETE |
| `app/docs/page.tsx` | Server page — query docs + projects join |
| `app/docs/[id]/page.tsx` | Server page — query single doc |
| `app/components/DocsLanding.tsx` | Client: list, search, create |
| `app/components/DocDetail.tsx` | Client: view/edit, markdown render, file upload |

## Files to Modify

| File | Change |
|------|--------|
| `db/schema.ts` | Add `docs` table + export `Doc`/`NewDoc` types |
| `app/components/Sidebar.tsx` | Add Docs entry to `modules` array |
| `CLAUDE.md` | Add Docs to Active Modules section |

---

## Step 1 — Dependency

Install `react-markdown` for markdown rendering:
```bash
npm install react-markdown
```

---

## Step 2 — Schema (`db/schema.ts`)

Add after the `memories` table:
```typescript
export const docs = sqliteTable("docs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").default("").notNull(),
  tags: text("tags").default("").notNull(),             // comma-separated
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()).notNull(),
});

export type Doc = typeof docs.$inferSelect;
export type NewDoc = typeof docs.$inferInsert;
```

---

## Step 3 — Migration

```bash
npx drizzle-kit generate && npx drizzle-kit migrate
```

---

## Step 4 — API Routes

### `app/api/docs/route.ts`
- **GET**: `db.select().from(docs).orderBy(desc(docs.pinned), desc(docs.createdAt)).all()`
- **POST**: Accept `{ title, content?, tags?, projectId? }`, insert, return created doc

### `app/api/docs/[id]/route.ts`
- **PATCH**: Accept any subset of `{ title, content, tags, projectId, pinned }` + set `updatedAt: new Date()`
- **DELETE**: Delete doc by id

---

## Step 5 — Server Pages

### `app/docs/page.tsx`
```typescript
export const dynamic = "force-dynamic";

// Query: left join docs → projects to get project name alongside each doc
const allDocs = db.select({ ...getTableColumns(docs), projectName: projects.name })
  .from(docs)
  .leftJoin(projects, eq(docs.projectId, projects.id))
  .orderBy(desc(docs.pinned), desc(docs.createdAt))
  .all();

// Also pass projects list for the "link to project" dropdown in create form
const allProjects = db.select({ id: projects.id, name: projects.name }).from(projects).all();

return <DocsLanding docs={allDocs} projects={allProjects} />;
```

### `app/docs/[id]/page.tsx`
```typescript
export const dynamic = "force-dynamic";

// Query single doc with project name
const doc = db.select({ ...getTableColumns(docs), projectName: projects.name })
  .from(docs)
  .leftJoin(projects, eq(docs.projectId, projects.id))
  .where(eq(docs.id, Number(params.id)))
  .get();

if (!doc) notFound();

return <DocDetail doc={doc} projects={allProjects} />;
```

---

## Step 6 — Client Components

### `app/components/DocsLanding.tsx`
- `"use client"` + `useState` for docs list, search query, project filter
- Sort: pinned docs first, then by createdAt desc (already sorted from server; maintain on mutations)
- Search: client-side filter on `title` + `tags` (case-insensitive substring match)
- Project filter: dropdown to filter by associated project
- Create: inline form (title input + optional project dropdown) → POST → navigate to `/docs/[id]`
- Doc card: title, tags chips, project badge (if set), created date, pin toggle button

### `app/components/DocDetail.tsx`
- `"use client"` + `useState` for doc fields + `isEditing` toggle
- **View mode**: render content with `<ReactMarkdown>` in a prose-styled container; show title, tags, project, timestamps in header
- **Edit mode**: `<textarea>` for content, `<input>` for title and tags, project `<select>`, file upload button
- **File upload**: `<input type="file" accept=".md,.txt">` — reads file with `FileReader`, populates content textarea
- **Pin toggle**: button in header, calls PATCH immediately (optimistic update)
- **Save**: PATCH all fields, update local state with response, switch back to view mode
- **Delete**: confirm → DELETE → navigate to `/docs`
- **Back**: link to `/docs`

---

## Step 7 — Sidebar (`app/components/Sidebar.tsx`)

Add to `modules` array between Projects and Settings:
```typescript
{ label: "Docs", icon: BookOpen, href: "/docs", active: true },
```
`BookOpen` is already available in lucide-react.

---

## Step 8 — CLAUDE.md Updates

Add to "Active Modules":
```markdown
### Docs `/docs`
- Page: `app/docs/page.tsx` — loads all docs with projects left join, sorted pinned-first
- Detail: `app/docs/[id]/page.tsx` → `app/components/DocDetail.tsx` — view/edit + markdown render
- Components: `app/components/DocsLanding.tsx`, `app/components/DocDetail.tsx`
- API: `app/api/docs/` (GET list + POST create), `app/api/docs/[id]/` (PATCH + DELETE)
- Features: client-side search (title + tags), project link, pinning, file upload (.md), react-markdown render
```

Add to DB tables:
```
| `docs` | id, title, content, tags, project_id, pinned, created_at, updated_at | markdown documents; project_id FK nullable; tags comma-separated |
```

---

## Verification

1. Run `npm run dev` and navigate to `/docs` — page loads without error
2. Create a new doc — appears in list, navigate to detail page
3. Edit content with markdown syntax, save → view mode renders markdown
4. Upload a `.md` file → content populates in editor
5. Pin a doc → it moves to top of list
6. Link doc to a project → project badge appears on card
7. Search by title and by tag — list filters correctly
8. Delete a doc → removed from list, redirect to `/docs`
9. Run `/smoke-check` to validate all API routes respond correctly
