import { db } from "@/lib/db";
import { projects, projectItems } from "@/db/schema";
import { asc, count } from "drizzle-orm";
import ProjectsLanding from "@/app/components/ProjectsLanding";

// No force-dynamic — page is statically cached and revalidated via revalidatePath
// after any project or item mutation. See app/api/projects/** routes.
export const revalidate = false;

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
