---
description: Rebuild the Docker image with the current DB as the updated seed
allowed-tools: Bash, Read, TodoWrite
---

Rebuild the Command Center Docker image, baking the current database state in as the updated starter seed.

**When to run:** After adding a new module (new migrations applied), or when you want teammates to receive updated starting data.

**Step 1 — Checkpoint the WAL**
Stop the dev server if it's running, then flush pending WAL writes to the main DB file:
```bash
npm run db:checkpoint
```

**Step 2 — Export seeds**
Regenerate all seed files from the live DB so they stay in sync with actual data:
```bash
npm run db:export-seeds
```
If the seed files changed, stage and commit them now so the git history stays clean.

**Step 3 — Rebuild the image**
```bash
npm run docker:build
```
This re-copies your current `db/command-center.db` into the image as the new seed. All migrations in `drizzle/` are also refreshed. Docker's layer cache means this is fast when only the DB changed — the `npm run build` layer is reused.

**Step 4 — Smoke-test**
```bash
npm run docker:up
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/docs
npm run docker:down
```
Expect 200. If the container fails to start, check logs: `docker compose logs app`.

**Step 5 — Update this skill**
If the rebuild required additional steps (new env vars, port changes, config changes), add them here before finishing.
