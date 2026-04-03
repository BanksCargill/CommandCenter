import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { docs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeDocFile, deleteDocFile } from "@/lib/doc-files";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docId = parseInt(id);
  const body = await request.json() as Partial<{
    title: string;
    content: string;
    tags: string;
    projectId: number | null;
    pinned: boolean;
  }>;

  const updated = db
    .update(docs)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.projectId !== undefined && { projectId: body.projectId }),
      ...(body.pinned !== undefined && { pinned: body.pinned }),
      updatedAt: new Date(),
    })
    .where(eq(docs.id, docId))
    .returning()
    .get();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  writeDocFile(updated.id, updated.title, updated.content);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docId = parseInt(id);
  db.delete(docs).where(eq(docs.id, docId)).run();
  deleteDocFile(docId);
  return NextResponse.json({ ok: true });
}
