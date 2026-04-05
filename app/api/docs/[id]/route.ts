import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { docs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeDocFile, deleteDocFile } from "@/lib/doc-files";
import { parseId } from "@/lib/url-validator";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docId = parseId(id);
  if (!docId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const MAX_DOC_BYTES = 5 * 1024 * 1024;
  const raw = await request.text();
  if (raw.length > MAX_DOC_BYTES) {
    return NextResponse.json({ error: "Request body too large (max 5 MB)" }, { status: 413 });
  }
  const body = JSON.parse(raw) as Partial<{
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
  revalidatePath("/docs");
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docId = parseId(id);
  if (!docId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  db.delete(docs).where(eq(docs.id, docId)).run();
  deleteDocFile(docId);
  revalidatePath("/docs");
  return NextResponse.json({ ok: true });
}
