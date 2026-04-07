import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { chelseaMatches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseId } from "@/lib/url-validator";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseId(id);
  if (!matchId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const raw = await request.text();
  if (raw.length > 64 * 1024) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }
  const body = JSON.parse(raw) as Partial<{
    matchDate: string;
    opponent: string;
    competition: string;
    venue: "home" | "away" | "neutral";
    result: "win" | "draw" | "loss" | "upcoming";
    score: string | null;
    notes: string | null;
  }>;

  const updated = db
    .update(chelseaMatches)
    .set({
      ...(body.matchDate !== undefined && { matchDate: new Date(body.matchDate) }),
      ...(body.opponent !== undefined && { opponent: body.opponent }),
      ...(body.competition !== undefined && { competition: body.competition }),
      ...(body.venue !== undefined && { venue: body.venue }),
      ...(body.result !== undefined && { result: body.result }),
      ...(body.score !== undefined && { score: body.score }),
      ...(body.notes !== undefined && { notes: body.notes }),
    })
    .where(eq(chelseaMatches.id, matchId))
    .returning()
    .get();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidatePath("/chelsea");
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseId(id);
  if (!matchId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  db.delete(chelseaMatches).where(eq(chelseaMatches.id, matchId)).run();
  revalidatePath("/chelsea");
  return NextResponse.json({ ok: true });
}
