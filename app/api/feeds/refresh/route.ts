import { NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/fetcher";

export async function POST() {
  try {
    const added = await fetchAllFeeds();
    return NextResponse.json({ added });
  } catch (err) {
    console.error("[refresh] Failed:", err);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
