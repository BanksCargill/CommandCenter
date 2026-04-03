import { db } from "@/lib/db";
import { projects, projectItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import ProjectBoard from "@/app/components/ProjectBoard";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = parseInt(id);

  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) notFound();

  const items = db
    .select()
    .from(projectItems)
    .where(eq(projectItems.projectId, projectId))
    .orderBy(asc(projectItems.sortOrder), asc(projectItems.createdAt))
    .all();

  return <ProjectBoard project={project} initialItems={items} />;
}
