import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { chelseaMatches } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const team = new URL(request.url).searchParams.get("team") ?? "chelsea";
  const matches = db
    .select()
    .from(chelseaMatches)
    .where(eq(chelseaMatches.team, team))
    .orderBy(asc(chelseaMatches.matchDate))
    .all();
  return NextResponse.json(matches);
}

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }
  const body = JSON.parse(raw) as Partial<{
    team: string;
    matchDate: string;
    opponent: string;
    competition: string;
    venue: "home" | "away" | "neutral";
    result: "win" | "draw" | "loss" | "upcoming";
    score: string;
    notes: string;
    externalId: string;
  }>;

  if (!body.matchDate || !body.opponent || !body.competition) {
    return NextResponse.json(
      { error: "matchDate, opponent, and competition are required" },
      { status: 400 }
    );
  }

  const created = db
    .insert(chelseaMatches)
    .values({
      team: body.team ?? "chelsea",
      matchDate: new Date(body.matchDate),
      opponent: body.opponent,
      competition: body.competition,
      venue: body.venue ?? "home",
      result: body.result ?? "upcoming",
      score: body.score ?? null,
      notes: body.notes ?? null,
      externalId: body.externalId ?? null,
    })
    .returning()
    .get();

  revalidatePath("/chelsea");
  return NextResponse.json(created, { status: 201 });
}
