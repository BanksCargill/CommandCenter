import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const items = db
    .select()
    .from(projectItems)
    .where(eq(projectItems.projectId, parseInt(id)))
    .orderBy(asc(projectItems.sortOrder), asc(projectItems.createdAt))
    .all();
  return NextResponse.json(items);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { title, notes, status, tags } = await request.json();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  // Place new item at end of its column
  const existing = db
    .select()
    .from(projectItems)
    .where(eq(projectItems.projectId, parseInt(id)))
    .all();
  const sortOrder = existing.length;

  const resolvedStatus = status ?? "todo";
  const now = new Date();
  const created = db
    .insert(projectItems)
    .values({
      projectId: parseInt(id),
      title,
      notes: notes ?? null,
      status: resolvedStatus,
      tags: tags ?? null,
      sortOrder,
      startedAt: resolvedStatus === "todo" ? now : null,
      completedAt: resolvedStatus === "done" ? now : null,
      updatedAt: now,
    })
    .returning()
    .get();
  revalidatePath("/projects");
  return NextResponse.json(created, { status: 201 });
}
