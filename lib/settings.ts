import { db } from "@/lib/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SETTING_DEFAULTS: Record<string, string> = {
  fetch_interval_hours: "3",
  digest_size: "5",
  digest_default_on: "true",
  retention_days: "30",
  news_feed_limit: "100",
  football_api_key: "",
};

// Map-based lookup avoids prototype-pollution risk on plain object key access.
const DEFAULTS_MAP = new Map(Object.entries(SETTING_DEFAULTS));

export function getSetting(key: string): string {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? DEFAULTS_MAP.get(key) ?? "";
}

export function getSettingInt(key: string): number {
  return parseInt(getSetting(key), 10);
}

export function getSettingBool(key: string): boolean {
  return getSetting(key) === "true";
}

export function setSetting(key: string, value: string): void {
  db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    })
    .run();
}

export function getAllSettings(): Record<string, string> {
  const rows = db.select().from(settings).all();
  const result: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
