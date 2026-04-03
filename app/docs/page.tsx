import { db } from "@/lib/db";
import { docs, projects } from "@/db/schema";
import { desc, eq, getTableColumns } from "drizzle-orm";
import DocsLanding from "@/app/components/DocsLanding";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  const allDocs = db
    .select({ ...getTableColumns(docs), projectName: projects.name })
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
