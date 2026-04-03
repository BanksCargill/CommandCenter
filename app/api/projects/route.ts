import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";

export async function GET() {
  const all = db.select().from(projects).all();
  return NextResponse.json(all);
}

export async function POST(request: NextRequest) {
  const { name, description } = await request.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const created = db.insert(projects).values({ name, description }).returning().get();
  revalidatePath("/projects");
  return NextResponse.json(created, { status: 201 });
}
