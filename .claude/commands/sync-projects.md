---
description: Sync the Command Center project board and CLAUDE.md with the codebase
allowed-tools: Bash, Read, Edit, Glob, Grep, TodoWrite
---

Synchronize the Command Center project board and CLAUDE.md with the current state of the codebase.

**Step 1 — Read context**
Read `CLAUDE.md` to understand the documented state of active modules, settings keys, and utilities.

**Step 2 — Audit the codebase**
For each active module listed in CLAUDE.md, verify:
- Are all listed file paths still accurate? Do the files exist?
- Have new files been added (components, API routes, lib/ utilities) that are not documented?
- Have any settings keys been added to `lib/settings.ts → SETTING_DEFAULTS` that are missing from CLAUDE.md?
- Have any new DB tables been added to `db/schema.ts` that are missing from the tables list?
- Have any new **columns** been added to existing tables that aren't reflected in the "Key columns" list in CLAUDE.md?
- Have any new **npm dependencies** been added to `package.json` that aren't reflected in the Tech Stack table in CLAUDE.md?

**Step 3 — Update CLAUDE.md**
Fix any drift found in Step 2. Keep the file concise — update or add only what changed.

**Step 4 — Update project tasks**
Read the current items in the "Command Center" project (`/projects/1`) via `curl http://localhost:3000/api/projects/1/items`. Then:
- Features clearly complete in the codebase but still in Todo/Ideas → move to Done
- Work that is genuinely in progress → ensure it's in Todo
- New ideas or improvements discovered during this audit → add to Ideas with appropriate tags
- Items that are no longer relevant (e.g. superseded by a different implementation) → archive them
- Ensure each item has accurate `tags` indicating its module (`news-feed`, `projects`, `settings`, etc.)

**Step 5 — Update this skill**
If the audit uncovered a type of drift that the current Step 2 checks would have systematically missed, add a new bullet to Step 2 so it is caught next time. Keep checks concrete and actionable — one line each.

**Step 6 — Report**
Summarize what was updated:
- CLAUDE.md changes (what sections, what was added/fixed)
- Project task changes (items moved, added, or archived)
- Any changes made to this skill itself
