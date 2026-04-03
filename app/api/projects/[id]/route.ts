import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);
  const body = await request.json() as Partial<{ name: string; description: string; archived: boolean }>;

  const updated = db
    .update(projects)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.archived !== undefined && { archived: body.archived }),
    })
    .where(eq(projects.id, projectId))
    .returning()
    .get();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);

  // Cascade delete items first (SQLite FK enforcement may be off)
  db.delete(projectItems).where(eq(projectItems.projectId, projectId)).run();
  db.delete(projects).where(eq(projects.id, projectId)).run();

  return NextResponse.json({ ok: true });
}
