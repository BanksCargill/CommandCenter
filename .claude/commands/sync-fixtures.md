---
description: CLI-trigger fixture sync for any football team without opening the app
allowed-tools: Bash, TodoWrite
---

Sync football fixtures from football-data.org for the specified team by POSTing to the running app's sync API.

**Usage:** `/sync-fixtures [team]`

Valid team values: `chelsea` | `england` | `usa` | `world_cup` | `ucl`

If no team is specified, default to `chelsea`.

---

**Step 1 — Determine team**
Read the argument passed after the slash command name. If none, use `chelsea`.

**Step 2 — POST to sync API**
```bash
curl -s -X POST "http://localhost:3000/api/chelsea/sync?team=<team>"
```

**Step 3 — Report result**
Parse the JSON response and report:
- Success: `+N added, N updated` (from `data.added` and `data.updated`)
- No API key: "No API key set — add `football_api_key` in Settings (`/settings`)"
- UCL note: "Champions League sync requires a paid football-data.org plan; free tier returns an error"
- Other error: print the `error` field from the response

**Step 4 — Update this skill**
If execution revealed a new team value, error case, or the API shape changed, update the valid team list and Step 3 handling above.
