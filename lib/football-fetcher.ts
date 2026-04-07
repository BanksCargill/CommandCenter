/**
 * Fetches football fixtures from football-data.org (free tier).
 * - Chelsea FC club (team ID 61) — Premier League, Champions League, etc.
 *   NOTE: FA Cup (FAC) is NOT available on the free tier.
 * - England national team (team ID 66)
 * - USA national team (team ID 762)
 * - FIFA World Cup (competition code WC / ID 2000)
 *
 * Requires the `football_api_key` setting to be set.
 */

import { db } from "@/lib/db";
import { chelseaMatches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSetting } from "@/lib/settings";

const API_BASE = "https://api.football-data.org/v4";

interface FDMatch {
  id: number;
  utcDate: string;
  status: string; // "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED"
  homeTeam: { id: number; name: string | null };
  awayTeam: { id: number; name: string | null };
  score: {
    winner: string | null; // "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
    fullTime: { home: number | null; away: number | null };
  };
  competition: { name: string };
}

function apiKey(): string | null {
  return getSetting("football_api_key") || null;
}

async function fetchFD(path: string, key: string): Promise<{ matches: FDMatch[] } | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "X-Auth-Token": key },
    });
    if (!res.ok) {
      console.error("[football-fetcher] API error:", res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[football-fetcher] fetch failed:", err);
    return null;
  }
}

// --- Chelsea club (team 61) ---

export const CHELSEA_TEAM_ID = 61;

function mapTeamResult(match: FDMatch, teamId: number): "win" | "draw" | "loss" | "upcoming" {
  if (match.status === "FINISHED") {
    if (match.score.winner === "DRAW") return "draw";
    const isHome = match.homeTeam.id === teamId;
    if (match.score.winner === "HOME_TEAM") return isHome ? "win" : "loss";
    if (match.score.winner === "AWAY_TEAM") return isHome ? "loss" : "win";
  }
  return "upcoming";
}

function mapTeamScore(match: FDMatch, teamId: number): string | null {
  const { home, away } = match.score.fullTime;
  if (home === null || away === null) return null;
  const isHome = match.homeTeam.id === teamId;
  return isHome ? `${home}-${away}` : `${away}-${home}`;
}

function mapTeamVenue(match: FDMatch, teamId: number): "home" | "away" | "neutral" {
  if (match.homeTeam.id === teamId) return "home";
  if (match.awayTeam.id === teamId) return "away";
  return "neutral";
}

function mapTeamOpponent(match: FDMatch, teamId: number): string {
  return match.homeTeam.id === teamId ? match.awayTeam.name : match.homeTeam.name;
}

async function fetchTeamFixtures(
  teamId: number,
  teamSlug: string
): Promise<{ added: number; updated: number; error?: string }> {
  const key = apiKey();
  if (!key) return { added: 0, updated: 0, error: "no_api_key" };

  const data = await fetchFD(`/teams/${teamId}/matches?limit=50`, key);
  if (!data) return { added: 0, updated: 0, error: "fetch_failed" };

  let added = 0;
  let updated = 0;

  for (const match of data.matches) {
    const externalId = String(match.id);
    const existing = db
      .select()
      .from(chelseaMatches)
      .where(and(eq(chelseaMatches.externalId, externalId), eq(chelseaMatches.team, teamSlug)))
      .get();

    const values = {
      team: teamSlug,
      externalId,
      matchDate: new Date(match.utcDate),
      opponent: mapTeamOpponent(match, teamId),
      competition: match.competition.name,
      venue: mapTeamVenue(match, teamId),
      result: mapTeamResult(match, teamId),
      score: mapTeamScore(match, teamId),
    };

    if (existing) {
      db.update(chelseaMatches).set(values).where(eq(chelseaMatches.id, existing.id)).run();
      updated++;
    } else {
      db.insert(chelseaMatches).values(values).run();
      added++;
    }
  }

  return { added, updated };
}

export async function fetchChelseaFixtures() {
  return fetchTeamFixtures(CHELSEA_TEAM_ID, "chelsea");
}

export async function fetchEnglandFixtures() {
  return fetchTeamFixtures(66, "england");
}

export async function fetchUsaFixtures() {
  return fetchTeamFixtures(762, "usa");
}

// --- UEFA Champions League (competition CL / 2001) ---
// NOTE: CL requires a paid football-data.org plan. Sync will error on free tier.

export async function fetchUCLFixtures(): Promise<{
  added: number;
  updated: number;
  error?: string;
}> {
  const key = apiKey();
  if (!key) return { added: 0, updated: 0, error: "no_api_key" };

  const data = await fetchFD("/competitions/CL/matches", key);
  if (!data) return { added: 0, updated: 0, error: "fetch_failed" };

  let added = 0;
  let updated = 0;

  for (const match of data.matches) {
    const externalId = `ucl_${match.id}`;
    const existing = db
      .select()
      .from(chelseaMatches)
      .where(and(eq(chelseaMatches.externalId, externalId), eq(chelseaMatches.team, "ucl")))
      .get();

    // For neutral competitions (UCL), win/loss from the home team's perspective is
    // meaningless. Use "draw" as a proxy for "played" — the score tells the story.
    const result: "win" | "draw" | "loss" | "upcoming" =
      match.status === "FINISHED" ? "draw" : "upcoming";

    const { home, away } = match.score.fullTime;
    const score = home !== null && away !== null ? `${home}-${away}` : null;

    const values = {
      team: "ucl",
      externalId,
      matchDate: new Date(match.utcDate),
      opponent: `${match.homeTeam.name || "TBD"} vs ${match.awayTeam.name || "TBD"}`,
      competition: match.competition.name,
      venue: "neutral" as const,
      result,
      score,
    };

    if (existing) {
      db.update(chelseaMatches).set(values).where(eq(chelseaMatches.id, existing.id)).run();
      updated++;
    } else {
      db.insert(chelseaMatches).values(values).run();
      added++;
    }
  }

  return { added, updated };
}

// --- World Cup (competition WC / 2000) ---

export async function fetchWorldCupFixtures(): Promise<{
  added: number;
  updated: number;
  error?: string;
}> {
  const key = apiKey();
  if (!key) return { added: 0, updated: 0, error: "no_api_key" };

  const data = await fetchFD("/competitions/WC/matches", key);
  if (!data) return { added: 0, updated: 0, error: "fetch_failed" };

  let added = 0;
  let updated = 0;

  for (const match of data.matches) {
    const externalId = `wc_${match.id}`;
    const existing = db
      .select()
      .from(chelseaMatches)
      .where(and(eq(chelseaMatches.externalId, externalId), eq(chelseaMatches.team, "world_cup")))
      .get();

    // For World Cup matches, show both teams in the opponent field.
    // Win/loss from home team's perspective is meaningless for a neutral-venue competition;
    // use "draw" as a proxy for "played" — the score tells the story.
    const result: "win" | "draw" | "loss" | "upcoming" =
      match.status === "FINISHED" ? "draw" : "upcoming";

    const { home, away } = match.score.fullTime;
    const score = home !== null && away !== null ? `${home}-${away}` : null;

    const values = {
      team: "world_cup",
      externalId,
      matchDate: new Date(match.utcDate),
      opponent: `${match.homeTeam.name || "TBD"} vs ${match.awayTeam.name || "TBD"}`,
      competition: match.competition.name,
      venue: "neutral" as const,
      result,
      score,
    };

    if (existing) {
      db.update(chelseaMatches).set(values).where(eq(chelseaMatches.id, existing.id)).run();
      updated++;
    } else {
      db.insert(chelseaMatches).values(values).run();
      added++;
    }
  }

  return { added, updated };
}
