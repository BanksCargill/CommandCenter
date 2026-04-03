---
description: Smoke-test all active module API routes against the running app
allowed-tools: Bash, Read, TodoWrite
---

Verify that the running Command Center app is healthy by hitting every active API route and checking response shapes. The server must be running on `http://localhost:3000`.

Use the TodoWrite tool to track each check. Run all curl commands via Bash.

---

**Step 1 — Read active modules**
Read `CLAUDE.md` to identify all active modules and their API routes. This is the source of truth for what to check — not a hardcoded list.

**Step 2 — Check core API routes**

For each route, run `curl -s -o /dev/null -w "%{http_code}" <url>` and confirm 200. Then spot-check the response shape.

Current routes to verify:

| Route | Method | Expected shape |
|-------|--------|----------------|
| `/api/feeds` | GET | array of feed source objects with `id`, `name`, `url`, `adapter` |
| `/api/news` | GET | array of news item objects with `id`, `title`, `url` |
| `/api/projects` | GET | array of project objects with `id`, `name` |
| `/api/projects/1/items` | GET | array of project item objects with `id`, `title`, `status` |
| `/api/settings` | GET | object with known keys (`fetch_interval_hours`, `digest_size`, etc.) |
| `/api/settings/stats` | GET | object with `total`, `oldest`, `newest` or similar |
| `/api/docs` | GET | array of doc objects with `id`, `title`, `pinned` |

For each: log PASS or FAIL with the HTTP status and a one-line note on the shape.

**Step 3 — Check page routes**
Verify the main pages return 200 (server-rendered, not just API):

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/projects
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/settings
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/docs
```

**Step 4 — Report results**
List each check as PASS / FAIL. If anything failed, note the likely cause (DB not migrated, route missing, server not running, etc.) and suggest the fix.

**Step 5 — Update this skill**
If a new module was added since this skill was last updated, add its API routes to the table in Step 2 and its page to Step 3. If a route's expected shape changed, update the table. Keep the table in sync with `CLAUDE.md` active modules — they should always agree.
