import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { feedSources, newsItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateFeedUrl, parseId } from "@/lib/url-validator";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseId(id);
  if (!numId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await request.json();

  if (body.url !== undefined) {
    const urlCheck = validateFeedUrl(body.url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }
  }

  const existing = db.select().from(feedSources).where(eq(feedSources.id, numId)).get();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = db
    .update(feedSources)
    .set({ active: body.active ?? !existing.active })
    .where(eq(feedSources.id, numId))
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
  const numId = parseId(id);
  if (!numId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  db.delete(newsItems).where(eq(newsItems.feedSourceId, numId)).run();
  db.delete(feedSources).where(eq(feedSources.id, numId)).run();

  revalidatePath("/");
  return NextResponse.json({ success: true });
}
