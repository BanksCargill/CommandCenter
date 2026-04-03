import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { feedSources, newsItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = db.select().from(feedSources).where(eq(feedSources.id, parseInt(id))).get();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = db
    .update(feedSources)
    .set({ active: body.active ?? !existing.active })
    .where(eq(feedSources.id, parseInt(id)))
    .returning()
    .get();

  revalidatePath("/");
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id);

  db.delete(newsItems).where(eq(newsItems.feedSourceId, numId)).run();
  db.delete(feedSources).where(eq(feedSources.id, numId)).run();

  revalidatePath("/");
  return NextResponse.json({ success: true });
}
