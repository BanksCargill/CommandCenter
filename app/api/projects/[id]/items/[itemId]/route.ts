import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseId } from "@/lib/url-validator";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params;
  const itemIdNum = parseId(itemId);
  if (!itemIdNum) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const body = await request.json();

  const existing = db.select().from(projectItems).where(eq(projectItems.id, itemIdNum)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const newStatus: string | undefined = body.status;

  // Derive timestamp side-effects from status transitions
  const startedAt =
    newStatus === "todo" && !existing.startedAt ? now : undefined;
  const completedAt =
    newStatus === "done" ? now
    : newStatus !== undefined && newStatus !== "done" && existing.completedAt ? null
    : undefined;

  const updated = db
    .update(projectItems)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.archived !== undefined && { archived: body.archived }),
      ...(startedAt !== undefined && { startedAt }),
      ...(completedAt !== undefined && { completedAt }),
      updatedAt: now,
    })
    .where(eq(projectItems.id, itemIdNum))
    .returning()
    .get();

  revalidatePath("/projects");
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params;
  const itemIdNum = parseId(itemId);
  if (!itemIdNum) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  db.delete(projectItems).where(eq(projectItems.id, itemIdNum)).run();
  revalidatePath("/projects");
  return NextResponse.json({ success: true });
}
