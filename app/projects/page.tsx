import { db } from "@/lib/db";
import { projects, projectItems } from "@/db/schema";
import { asc, count } from "drizzle-orm";
import ProjectsLanding from "@/app/components/ProjectsLanding";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  const allProjects = db
    .select()
    .from(projects)
    .orderBy(asc(projects.createdAt))
    .all();

  // Count items per project per status
  const counts = db
    .select({
      projectId: projectItems.projectId,
      status: projectItems.status,
      total: count(),
    })
    .from(projectItems)
    .groupBy(projectItems.projectId, projectItems.status)
    .all();

  return <ProjectsLanding projects={allProjects} itemCounts={counts} />;
}
