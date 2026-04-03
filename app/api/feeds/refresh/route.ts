import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fetchAllFeeds } from "@/lib/fetcher";

export async function POST() {
  try {
    const added = await fetchAllFeeds();
    revalidatePath("/");
    return NextResponse.json({ added });
  } catch (err) {
    console.error("[refresh] Failed:", err);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
