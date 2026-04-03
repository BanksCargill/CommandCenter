import { db } from "@/lib/db";
import { docs, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import DocsLanding from "@/app/components/DocsLanding";

// No force-dynamic — page is statically cached and revalidated via revalidatePath
// after any doc mutation. See app/api/docs/** routes.
export const revalidate = false;

export default function DocsPage() {
  // Exclude `content` — can be large markdown, not needed for the list view
  const allDocs = db
    .select({
      id: docs.id,
      title: docs.title,
      tags: docs.tags,
      projectId: docs.projectId,
      pinned: docs.pinned,
      createdAt: docs.createdAt,
      updatedAt: docs.updatedAt,
      projectName: projects.name,
    })
    .from(docs)
    .leftJoin(projects, eq(docs.projectId, projects.id))
    .orderBy(desc(docs.pinned), desc(docs.createdAt))
    .all();

  const allProjects = db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .all();

  return <DocsLanding docs={allDocs} projects={allProjects} />;
}
