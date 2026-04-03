import { db } from "@/lib/db";
import { docs, projects } from "@/db/schema";
import { eq, getTableColumns } from "drizzle-orm";
import { notFound } from "next/navigation";
import DocDetail from "@/app/components/DocDetail";
import { syncFromFileIfNewer } from "@/lib/doc-files";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docId = Number(id);

  // Auto-push if local file is newer than DB (e.g. edited outside the app)
  const existing = db.select({ updatedAt: docs.updatedAt }).from(docs).where(eq(docs.id, docId)).get();
  if (existing) {
    syncFromFileIfNewer(docId, existing.updatedAt, (content) => {
      db.update(docs).set({ content, updatedAt: new Date() }).where(eq(docs.id, docId)).run();
    });
  }

  const doc = db
    .select({ ...getTableColumns(docs), projectName: projects.name })
    .from(docs)
    .leftJoin(projects, eq(docs.projectId, projects.id))
    .where(eq(docs.id, docId))
    .get();

  if (!doc) notFound();

  const allProjects = db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .all();

  return <DocDetail doc={doc} projects={allProjects} />;
}
