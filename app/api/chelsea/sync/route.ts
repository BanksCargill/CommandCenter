import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  fetchChelseaFixtures,
  fetchEnglandFixtures,
  fetchUsaFixtures,
  fetchWorldCupFixtures,
  fetchUCLFixtures,
} from "@/lib/football-fetcher";

export async function POST(request: NextRequest) {
  const team = new URL(request.url).searchParams.get("team") ?? "chelsea";

  let result;
  switch (team) {
    case "chelsea":
      result = await fetchChelseaFixtures();
      break;
    case "england":
      result = await fetchEnglandFixtures();
      break;
    case "usa":
      result = await fetchUsaFixtures();
      break;
    case "world_cup":
      result = await fetchWorldCupFixtures();
      break;
    case "ucl":
      result = await fetchUCLFixtures();
      break;
    default:
      return NextResponse.json({ error: "unknown_team" }, { status: 400 });
  }

  revalidatePath("/chelsea");
  return NextResponse.json(result);
}
