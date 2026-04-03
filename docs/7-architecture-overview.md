# Command Center — Architecture Overview

> High-level reference for developers exploring the codebase. Covers structure, data flow, module pattern, DB schema, and background jobs.

---

## 1. System Overview

The app is a single-user, local-only Next.js 15 dashboard. There is no auth, no cloud services, and no external state management. All persistence is SQLite on disk.

```mermaid
graph TD
    Browser["Browser (React 19 client)"]
    Next["Next.js 15 - Node.js App Router"]
    SQLite["SQLite - better-sqlite3 WAL mode"]
    Cron["node-cron - instrumentation.ts - hourly"]
    External["External APIs: HN · Reddit · DEV.to · RSS"]

    Browser -->|"HTTP: page loads + fetch mutations"| Next
    Next -->|"Drizzle ORM (synchronous)"| SQLite
    SQLite -->|"query results (server-side, per request)"| Next
    Cron -->|"fetch active sources"| External
    External -->|"normalised items"| Cron
    Cron -->|"upsert news_items, purge old items"| SQLite
```

**Key properties:**
- `better-sqlite3` is **synchronous** — no async/await needed in DB calls
- `force-dynamic` on every server page — no caching, always fresh from DB
- No global client state (no Zustand, SWR, React Query)

---

## 2. Universal Module Pattern

Every module follows the same four-layer structure. Learning it once means you understand them all.

```mermaid
graph LR
    subgraph server ["Server (Node.js)"]
        Page["app/[module]/page.tsx
Server Component
force-dynamic
Queries DB + passes initialData"]
        API["app/api/[module]/route.ts
GET · POST · PATCH · DELETE
Returns JSON"]
        DB["lib/db.ts - SQLite
Drizzle ORM - Synchronous"]
    end

    subgraph client ["Client (Browser)"]
        Comp["app/components/[Module]Landing.tsx
use client
useState(initialData)
fetch() mutations + optimistic updates"]
    end

    Page -->|"props: initialData"| Comp
    Comp -->|"fetch() calls"| API
    API -->|"Drizzle ORM"| DB
    DB -->|"rows on page load"| Page
```

**Why this works at this scale:**
- Server page does the heavy lifting (joins, sorting) once per navigation
- Client gets pre-populated state — no loading spinner on mount
- Mutations are cheap `fetch()` calls; optimistic updates keep the UI snappy
- No hydration mismatch: server passes plain JSON, client stores it in `useState`

---

## 3. Page Load vs Mutation — Sequence Diagrams

### 3a. Page Load (e.g. navigating to /docs)

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant NextServer as Next.js Server
    participant DB as SQLite

    User->>Browser: Navigate to /docs
    Browser->>NextServer: GET /docs
    NextServer->>DB: SELECT docs LEFT JOIN projects
    DB-->>NextServer: rows[]
    NextServer-->>Browser: SSR HTML with embedded initialData
    Note over Browser: React hydrates with initialData. No loading state.
```

### 3b. Mutation (e.g. saving an edited doc)

```mermaid
sequenceDiagram
    actor User
    participant React as React Client
    participant API as /api/docs/[id]
    participant DB as SQLite

    User->>React: Click Save
    React->>React: Optimistic update via useState
    React->>API: PATCH /api/docs/42 with body
    API->>DB: UPDATE docs SET ... WHERE id = 42
    DB-->>API: updated row
    API-->>React: JSON response
    React->>React: Reconcile state with server response
```

---

## 4. Database Schema

```mermaid
erDiagram
    projects {
        int id PK
        text name
        text description
        bool archived
        timestamp created_at
    }
    project_items {
        int id PK
        int project_id FK
        text title
        text notes
        text status
        text tags
        bool archived
        int sort_order
        timestamp started_at
        timestamp completed_at
        timestamp updated_at
        timestamp created_at
    }
    feed_sources {
        int id PK
        text name
        text url
        text type
        text adapter
        text topic_tags
        bool active
        timestamp created_at
    }
    news_items {
        int id PK
        int feed_source_id FK
        text title
        text url
        text summary
        int score
        timestamp published_at
        timestamp fetched_at
    }
    docs {
        int id PK
        int project_id FK
        text title
        text content
        text tags
        bool pinned
        timestamp created_at
        timestamp updated_at
    }
    settings {
        text key PK
        text value
        timestamp updated_at
    }
    memories {
        int id PK
        text content
        text tags
        text source
        timestamp created_at
    }

    projects ||--o{ project_items : "has items"
    feed_sources ||--o{ news_items : "produces"
    projects |o--o{ docs : "optionally linked"
```

**Notes:**
- `news_items.url` has a UNIQUE constraint — duplicate articles are silently ignored on upsert
- `project_items.sort_order` is managed by drag-and-drop (dnd-kit); PATCH fires on drop
- `settings` is a flat key-value store; defaults live in `lib/settings.ts → SETTING_DEFAULTS`
- `memories` table exists in schema but the module is stubbed (disabled in Sidebar)
- `project_items.status` values: idea | todo | done

---

## 5. Background Job — Feed Fetcher

```mermaid
sequenceDiagram
    participant Cron as node-cron (hourly tick)
    participant Settings as lib/settings.ts
    participant Fetcher as lib/fetcher.ts
    participant APIs as External APIs
    participant DB as SQLite

    Cron->>Settings: getSetting("last_fetched_at")
    Settings-->>Cron: ISO timestamp or empty
    alt not enough time elapsed
        Cron->>Cron: Skip and log
    else interval reached
        Cron->>Fetcher: fetchAllFeeds()
        Fetcher->>DB: SELECT active feed_sources
        DB-->>Fetcher: sources[]
        loop Each source, max 4 concurrent
            Fetcher->>APIs: fetch source URL
            APIs-->>Fetcher: raw feed data
            Fetcher->>Fetcher: Normalise via adapter
            Fetcher->>DB: INSERT OR IGNORE INTO news_items
        end
        Fetcher-->>Cron: new item count
        Cron->>Settings: setSetting("last_fetched_at", now)
        Cron->>DB: DELETE news_items older than retention_days
    end
```

**Feed adapters in `lib/fetcher.ts`:**

| Adapter | Source | Score field |
|---------|--------|-------------|
| null (RSS) | Any RSS/Atom feed | none |
| hn-algolia | Hacker News | points |
| reddit | Reddit | score |
| devto | DEV.to | positive_reactions_count |
| lobsters | Lobsters | score |

---

## 6. Routing & Component Map

```mermaid
graph TD
    Layout["app/layout.tsx - Sidebar + TopBar shell"]

    Layout --> News["/ News Feed
app/page.tsx
NewsFeed.tsx + FeedSources.tsx"]
    Layout --> Projects["app/projects/page.tsx
ProjectsLanding.tsx"]
    Layout --> Docs["app/docs/page.tsx
DocsLanding.tsx"]
    Layout --> Settings["app/settings/page.tsx
client-only, fetches on mount"]

    Projects --> Board["app/projects/[id]/page.tsx
ProjectBoard.tsx + ProjectCard.tsx
drag-and-drop Kanban"]
    Docs --> Detail["app/docs/[id]/page.tsx
DocDetail.tsx
react-markdown + Mermaid + syntax highlighting"]
```

---

## 7. Key Conventions at a Glance

| Convention | Detail |
|------------|--------|
| `export const dynamic = "force-dynamic"` | On every `page.tsx` — disables Next.js page caching |
| Synchronous DB | `better-sqlite3` — no `await` needed on queries |
| Optimistic updates | Client updates `useState` before `fetch()` resolves; reconciles with response |
| API errors | Always `{ error: "message" }` with appropriate HTTP status code |
| Tags | Comma-separated strings in a `text` column — split/join in the client |
| Sidebar toggle | `active: true/false` in `app/components/Sidebar.tsx → modules` array |
| New module | Run `/new-module` — scaffolds all 6 layers and updates docs automatically |
