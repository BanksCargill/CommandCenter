export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { fetchAllFeeds } = await import("./lib/fetcher");
    const { getSetting, setSetting, getSettingInt } = await import("./lib/settings");
    const { db } = await import("./lib/db");
    const { newsItems, docs } = await import("./db/schema");
    const { writeDocFile } = await import("./lib/doc-files");
    const fs = await import("fs");
    const path = await import("path");

    // On startup: import any .md files in docs/ that have no matching DB record
    const docsDir = path.join(process.cwd(), "docs");
    if (fs.existsSync(docsDir)) {
      const knownIds = new Set(db.select({ id: docs.id }).from(docs).all().map((r) => r.id));
      const files = fs.readdirSync(docsDir).filter((f: string) => f.endsWith(".md"));
      let imported = 0;
      for (const file of files) {
        const idMatch = file.match(/^(\d+)-/);
        if (idMatch && knownIds.has(Number(idMatch[1]))) continue; // already in DB
        const content = fs.readFileSync(path.join(docsDir, file), "utf8");
        const basename = path.basename(file, ".md");
        const title = basename.replace(/^\d+-/, "").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        const created = db.insert(docs).values({ title, content, tags: "", projectId: null }).returning().get();
        writeDocFile(created.id, created.title, created.content);
        console.log(`[docs] Imported "${title}" → doc ${created.id}`);
        imported++;
      }
      if (imported > 0) console.log(`[docs] Imported ${imported} new doc(s) from docs/`);
    }
    const { lt } = await import("drizzle-orm");

    // Run every hour; respect the fetch_interval_hours setting dynamically
    cron.schedule("0 * * * *", async () => {
      const intervalHours = getSettingInt("fetch_interval_hours");
      const lastFetchedStr = getSetting("last_fetched_at");
      const now = new Date();

      if (lastFetchedStr) {
        const hoursSince = (now.getTime() - new Date(lastFetchedStr).getTime()) / (1000 * 60 * 60);
        if (hoursSince < intervalHours) {
          console.log(`[cron] Skipping fetch — ${hoursSince.toFixed(1)}h elapsed (interval: ${intervalHours}h)`);
          return;
        }
      }

      console.log("[cron] Running scheduled feed fetch...");
      const added = await fetchAllFeeds();
      setSetting("last_fetched_at", now.toISOString());
      console.log(`[cron] Done — ${added} new items`);

      // Auto-purge based on retention_days setting
      const retentionDays = getSettingInt("retention_days");
      if (retentionDays > 0) {
        const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
        const result = db.delete(newsItems).where(lt(newsItems.fetchedAt, cutoff)).run();
        if (result.changes > 0) {
          console.log(`[cron] Purged ${result.changes} items older than ${retentionDays} days`);
        }
      }
    });

    console.log("[cron] Feed scheduler registered (checks every hour, respects fetch_interval_hours setting)");
  }
}
