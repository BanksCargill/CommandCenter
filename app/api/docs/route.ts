import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { docs } from "@/db/schema";
import { desc, like } from "drizzle-orm";
import { writeDocFile } from "@/lib/doc-files";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const titlePattern = searchParams.get("title");

  const query = db.select().from(docs).orderBy(desc(docs.pinned), desc(docs.createdAt));

  const all = titlePattern
    ? query.where(like(docs.title, titlePattern.replace(/\*/g, "%"))).all()
    : query.all();

  return NextResponse.json(all);
}

export async function POST(request: NextRequest) {
  const { title, content, tags, projectId } = await request.json();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const created = db
    .insert(docs)
    .values({ title, content: content ?? "", tags: tags ?? "", projectId: projectId ?? null })
    .returning()
    .get();

  writeDocFile(created.id, created.title, created.content);

  return NextResponse.json(created, { status: 201 });
}
