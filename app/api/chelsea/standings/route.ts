import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

// Cache for 1 hour — PL standings update a few times a week at most
export const revalidate = 3600;

interface FDStandingRow {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface FDStandingsResponse {
  standings: { type: string; table: FDStandingRow[] }[];
}

export async function GET() {
  const apiKey = getSetting("football_api_key");
  if (!apiKey) {
    return NextResponse.json({ error: "no_api_key" }, { status: 403 });
  }

  let data: FDStandingsResponse;
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/PL/standings", {
      headers: { "X-Auth-Token": apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[standings] API error:", res.status, text);
      return NextResponse.json({ error: `api_error_${res.status}` }, { status: 502 });
    }
    data = await res.json();
  } catch (err) {
    console.error("[standings] fetch failed:", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }

  const total = data.standings?.find((s) => s.type === "TOTAL");
  return NextResponse.json(total?.table ?? []);
}
