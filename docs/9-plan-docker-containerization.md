# Plan: Docker Containerization

## Context
The Dockerfile, docker-compose.yml, and .dockerignore all already exist from the initial repo setup. The structural choices are correct (multi-stage build, standalone output, volume-mounted SQLite). Three gaps prevent the image from actually running:

1. **No DB migration on startup** — `lib/db.ts` opens the SQLite file but never applies migrations. A fresh volume has no tables → the app crashes on first request.
2. **Migration files excluded from image** — `.dockerignore` excludes the `drizzle/` directory, so even if migration logic was added, the SQL files wouldn't be in the image.
3. **`better-sqlite3` native binary may not trace** — Next.js standalone uses file tracing (nft) to collect required files. Native `.node` binaries are not always picked up automatically, so the standalone image may ship without `better_sqlite3.node`.

---

## Files to Modify

| File | Change |
|------|--------|
| `lib/db.ts` | Add `migrate()` call after creating the DB connection |
| `.dockerignore` | Remove `db/*.db` and `drizzle` exclusions; add WAL file exclusions |
| `Dockerfile` | Copy `drizzle/` and seed DB into runner; use entrypoint script |
| `next.config.ts` | Add `outputFileTracingIncludes` for better-sqlite3 |
| `package.json` | Add `docker:build`, `docker:up`, `docker:down`, `docker:rebuild` scripts |
| `docker-compose.yml` | Add port-remapping comment (dev vs container conflict) |
| `.claude/commands/new-module.md` | Add final step: run `/rebuild-image` after smoke-check |
| `CLAUDE.md` | Add `/rebuild-image` to Skills table; add Docker maintenance rule; add plan-file convention |

## Files to Create

| File | Purpose |
|------|---------|
| `docker-entrypoint.sh` | On first run: copies seed DB to volume; then starts the server |
| `.claude/commands/rebuild-image.md` | Skill: rebuilds Docker image with current DB as updated seed |

---

## Step 1 — Auto-migration in `lib/db.ts`

Add Drizzle's synchronous migrator after the WAL pragma. Since `better-sqlite3` is fully synchronous, `migrate()` runs inline and completes before any request can be handled.

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/db/schema";
import path from "path";

const dbPath = path.join(process.cwd(), "db", "command-center.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
```

This runs every startup but is idempotent — Drizzle tracks applied migrations in a `__drizzle_migrations` table and skips already-applied ones.

---

## Step 2 — Fix `.dockerignore`

- Remove `db/*.db` — the seed DB needs to be in the build context
- Remove `drizzle` — migration SQL files must be in the image
- Add WAL sidecar exclusions — these are runtime-only files that shouldn't be copied

```
.next
node_modules
db/*.db-shm
db/*.db-wal
.env*
```

> **Note:** Your DB is embedded in the image. Anyone with the image can read its contents. Only share with trusted teammates, or push to a private registry.

---

## Step 3 — Create `docker-entrypoint.sh`

This script runs on container start. If no DB exists on the volume yet (first run), it copies the seed DB. Then it hands off to the Next.js server.

```sh
#!/bin/sh
set -e

if [ ! -f "/app/db/command-center.db" ]; then
  echo "No database found — copying starter database..."
  cp /app/db-seed/command-center.db /app/db/command-center.db
fi

exec node server.js
```

Migrations are handled automatically by `lib/db.ts` on startup (Step 1), so the entrypoint doesn't need to call anything extra.

---

## Step 4 — Update `Dockerfile`

Two additions to the runner stage:
1. Copy the seed DB from the builder to a `/app/db-seed/` location (separate from the volume mount path so it isn't overwritten at runtime)
2. Copy and wire up the entrypoint script

```dockerfile
# Stage 1: deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle

# Seed DB — copied to volume only on first run by entrypoint
COPY --from=builder /app/db/command-center.db /app/db-seed/command-center.db

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p ./db

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
```

---

## Step 5 — Fix native module tracing in `next.config.ts`

`better-sqlite3` ships a native `.node` binary (`build/Release/better_sqlite3.node`). Next.js's file tracer doesn't always pick up native binaries automatically. Add `outputFileTracingIncludes` to guarantee it's bundled into the standalone output:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./node_modules/better-sqlite3/**"],
  },
};

export default nextConfig;
```

---

---

## Step 6 — Create `.claude/commands/rebuild-image.md`

This skill handles the ongoing maintenance question: "how do I update the image as the app grows?" Run it after any new module or migration to refresh the baked-in seed DB.

```markdown
---
description: Rebuild the Docker image with the current DB as the updated seed
allowed-tools: Bash, Read, TodoWrite
---

Rebuild the Command Center Docker image, baking the current database state in as the updated starter seed.

**When to run:** After adding a new module (new migrations), or when you want teammates to receive updated starting data.

**Step 1 — Checkpoint the WAL**
Stop the dev server if it's running, then flush pending WAL writes to the main DB file:
\`\`\`bash
npx tsx -e "import Database from 'better-sqlite3'; const db = new Database('db/command-center.db'); db.pragma('wal_checkpoint(TRUNCATE)'); db.close(); console.log('WAL checkpointed');"
\`\`\`

**Step 2 — Rebuild the image**
\`\`\`bash
docker compose build
\`\`\`
This re-copies your current \`db/command-center.db\` into the image as the new seed. All migrations in \`drizzle/\` are also refreshed.

**Step 3 — Smoke-test**
\`\`\`bash
docker compose up -d
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/docs
docker compose down
\`\`\`
Expect 200. If the container fails to start, check logs: \`docker compose logs app\`.

**Step 4 — Update this skill**
If the rebuild required additional steps (new env vars, config changes, etc.), add them here.
```

---

## Step 7 — Update `CLAUDE.md`

Two additions:

1. Add `/rebuild-image` to the Skills table:

| Skill | When to run |
|-------|-------------|
| `/rebuild-image` | After any new module or migration — refreshes the Docker seed DB |

2. Add a Docker maintenance rule under Maintenance Responsibilities:

> After any new module is scaffolded (new migrations applied), run `/rebuild-image` so the Docker image stays current. Teammates who pull the updated image will receive the new schema and any seed data you've accumulated.

3. Add a plan-file convention: every plan file must include an "Upload to Docs" step immediately before the Verification section. This makes completed plans searchable in the app.

---

## Step 8 — Add npm scripts to `package.json`

Add under `"scripts"`:
```json
"docker:build": "docker compose build",
"docker:up": "docker compose up -d",
"docker:down": "docker compose down",
"docker:rebuild": "docker compose build && docker compose up -d"
```

Teammates and Claude can now use `npm run docker:up` etc. instead of remembering compose syntax.

---

## Step 9 — Update `docker-compose.yml` with port comment

Add a comment showing how to remap the port if running alongside the dev server:
```yaml
services:
  app:
    build: .
    ports:
      # Change host port (left side) if running alongside npm run dev on 3000
      # e.g. "3001:3000" to access container at http://localhost:3001
      - "3000:3000"
    volumes:
      # Persist the SQLite database outside the container
      - ./db:/app/db
    restart: unless-stopped
```

---

## Step 10 — Update `.claude/commands/new-module.md`

Add a final step after smoke-check:

> **Step 12 — Rebuild Docker image**
> Run `/rebuild-image` to bake the new module's schema and data into the Docker seed. This keeps the image teammates receive up-to-date automatically.

---

## Step 11 — Upload this plan to Docs

POST this plan file to `/api/docs`:
- `title`: "Plan: Docker Containerization"
- `tags`: "planning,docker,devops"
- `projectId`: 1

---

## Answers to Common Questions

**Will data added inside the container persist?**
Yes. The SQLite database file lives at `./db/command-center.db` on your host machine — the container reads and writes to that file via the volume mount (`./db:/app/db`). Adding tasks, docs, etc. writes to your local disk. The container itself is stateless; all state is in `./db/`.

**If multiple people get the image, does their data stay separate from yours?**
Yes. The image contains a *snapshot* of your DB at build time (inside `/app/db-seed/`). On **first run**, the entrypoint copies that snapshot to the teammate's local `./db/` folder. After that, all their changes go to their own machine. Your live DB is never touched — they forked from your snapshot the moment they started it.

> **Privacy note:** Your DB content is embedded in the image. Only share the image with trusted teammates or via a private registry.

**How do you start and stop it?**
From the project directory in a terminal:
```bash
docker compose up -d       # start in background (detached)
docker compose down        # stop and remove the container (data is safe)
docker compose up -d       # start again — same image, same data
```
You only need to run `docker compose build` again when the code changes. If only data has changed (new tasks, etc.), just `up` and `down`.

**Are these terminal commands?**
Yes — run them in any terminal (PowerShell, Windows Terminal, or VS Code terminal) from the project root. Docker Desktop must be running first.

**Can you still use Claude Code to develop while Docker runs?**
Yes, and the two roles are completely separate:

| Mode | Use for | How |
|------|---------|-----|
| `npm run dev` + Claude Code | Active development | Normal workflow — Claude reads/writes source files |
| `docker compose up` | Sharing / showing the app | Run the packaged image; no code editing |

If another developer clones the repo, they can open it in VS Code with Claude Code and continue building new modules using the same skills (`.claude/commands/`) and conventions (CLAUDE.md). Their Claude memory starts fresh (memory is per-user in `~/.claude/projects/`), but CLAUDE.md is in the repo so Claude follows the same architecture rules from day one.

**Summary:** Docker = ship and show the app. Repo + Claude Code = collaborate on and extend the app.

**Does rebuilding the image re-run `npm build` from scratch?**
No. Docker caches build layers. When only the DB changes (not the source code), Docker reuses the cached `npm install` and `npm run build` layers and only re-runs the DB copy step. Updating the seed takes seconds, not minutes.

---

## Verification

1. `docker compose build` — should complete without error; confirm no "cannot find module better_sqlite3.node" in output
2. `docker compose up` — first run on a fresh `./db` directory
3. Navigate to `http://localhost:3000` — page loads, news feed renders (DB was migrated automatically)
4. Navigate to `/docs`, `/projects`, `/settings` — all respond correctly
5. Stop container, restart it (`docker compose restart`) — data persists (volume mount working)
6. Run `/smoke-check` against the running container to confirm all API routes return 200
