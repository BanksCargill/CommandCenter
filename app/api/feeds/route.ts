import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { feedSources } from "@/db/schema";

export async function GET() {
  const sources = db.select().from(feedSources).all();
  return NextResponse.json(sources);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, url, type, topicTags } = body;

  if (!name || !url) {
    return NextResponse.json({ error: "name and url are required" }, { status: 400 });
  }

  const result = db
    .insert(feedSources)
    .values({ name, url, type: type ?? "rss", topicTags: topicTags ?? null, active: true })
    .returning()
    .get();

  revalidatePath("/");
  return NextResponse.json(result, { status: 201 });
}
