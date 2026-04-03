import { NextResponse } from "next/server";
import { getAllSettings, setSetting, SETTING_DEFAULTS } from "@/lib/settings";

export function GET() {
  const all = getAllSettings();
  return NextResponse.json(all);
}

export async function PUT(req: Request) {
  const body = await req.json() as Record<string, string>;
  const allowed = new Set(Object.keys(SETTING_DEFAULTS));
  for (const [key, value] of Object.entries(body)) {
    if (allowed.has(key)) {
      setSetting(key, String(value));
    }
  }
  return NextResponse.json({ ok: true });
}
