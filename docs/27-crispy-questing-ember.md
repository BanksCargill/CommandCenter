# Security Hardening Plan — Command Center

## Context

After running `npm install`, `npm audit` surfaced 13 vulnerabilities (5 moderate, 8 high) in the dependency tree. A full code review additionally found several application-level security gaps across the API layer, rendering pipeline, and Docker configuration. This plan addresses all findings in priority order, scoped appropriately for a single-user, local-network deployment.

---

## Findings Summary

### Critical / High

| # | Issue | Location |
|---|-------|----------|
| C1 | **npm audit: 13 known CVEs** (5 mod, 8 high) in dependency tree | `package.json` |
| C2 | **SSRF via feed URLs** — arbitrary URLs accepted; no private-IP or scheme validation | `app/api/feeds/route.ts`, `lib/fetcher.ts` |
| C3 | **XSS via Mermaid innerHTML** — SVG injected directly into DOM without sanitization | `app/components/MermaidBlock.tsx:21` |
| C4 | **No authentication on any API route** — all CRUD + destructive endpoints fully open | all `app/api/**/route.ts` |
| C5 | **No Content Security Policy** — no CSP or security headers in `next.config.ts` | `next.config.ts` |

### Medium

| # | Issue | Location |
|---|-------|----------|
| M1 | `parseInt()` used without NaN check — can pass `NaN` to DB queries | multiple `app/api/**/route.ts` |
| M2 | No URL scheme validation on news item links — `javascript:` URIs possible | `lib/fetcher.ts` (all adapters), `app/components/NewsFeed.tsx` |
| M3 | No request body size limit on Docs API — DoS via large payloads | `app/api/docs/route.ts`, `app/api/docs/[id]/route.ts` |
| M4 | Unauthenticated `/api/startup-revalidate` endpoint | `app/api/startup-revalidate/route.ts` |
| M5 | No rate limiting on destructive endpoints (`/api/feeds/refresh`, `/api/settings/purge`) | respective route files |

### Low

| # | Issue | Location |
|---|-------|----------|
| L1 | Docker runs as root — no non-root user in `Dockerfile` | `Dockerfile` |
| L2 | Silent file-write failures — errors swallowed in `lib/doc-files.ts` | `lib/doc-files.ts:36` |
| L3 | Error object stringified into innerHTML in MermaidBlock | `app/components/MermaidBlock.tsx:25` |

---

## Implementation Plan

### Step 1 — Fix npm vulnerabilities

Run `npm audit fix` for non-breaking fixes, then manually review any remaining high-severity issues that require `--force`. Check for breaking API changes before upgrading major versions.

```bash
npm audit fix
npm audit   # review remaining
```

---

### Step 2 — SSRF: Validate feed URLs before storage and fetch

**File:** `app/api/feeds/route.ts` (POST + PATCH handlers)
**File:** `lib/fetcher.ts` (add a guard before each fetch call)

Add a shared URL validation helper in `lib/url-validator.ts`:

```typescript
const BLOCKED_PATTERNS = [
  /^https?:\/\/(localhost|127\.|0\.0\.0\.0|::1)/i,
  /^https?:\/\/10\.\d+\.\d+\.\d+/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/,
  /^https?:\/\/192\.168\.\d+\.\d+/,
  /^https?:\/\/169\.254\.\d+\.\d+/,   // link-local / AWS metadata
];

export function validateFeedUrl(raw: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try { parsed = new URL(raw); } catch { return { valid: false, error: "Invalid URL" }; }
  if (!["http:", "https:"].includes(parsed.protocol))
    return { valid: false, error: "Only http/https URLs are allowed" };
  if (BLOCKED_PATTERNS.some(p => p.test(raw)))
    return { valid: false, error: "Private/loopback addresses are not allowed" };
  return { valid: true };
}
```

Call `validateFeedUrl(url)` in POST and PATCH handlers for feed sources; return `400` on failure.

---

### Step 3 — XSS: Sanitize Mermaid SVG output with DOMPurify

**File:** `app/components/MermaidBlock.tsx`

Install `dompurify` and its types:
```bash
npm install dompurify
npm install -D @types/dompurify
```

Replace direct `innerHTML` assignment with a DOMPurify call:
```typescript
import DOMPurify from "dompurify";

// line 21
ref.current.innerHTML = DOMPurify.sanitize(svg, {
  USE_PROFILES: { svg: true, svgFilters: true },
});

// line 25 — sanitize error string too (strip any HTML)
ref.current.innerHTML = `<pre class="text-red-400 text-sm p-2 whitespace-pre-wrap">${DOMPurify.sanitize(String(err))}</pre>`;
```

DOMPurify is already commonly used with Mermaid for exactly this purpose and has no runtime cost impact.

---

### Step 4 — Authentication: localhost-origin guard middleware

Since this is a single-user local deployment (never internet-facing), a full auth system is disproportionate. The right control is a **Next.js middleware** that:
- Allows all requests originating from `localhost` / `127.0.0.1`
- Returns `403` for any request that arrives with an external `Host` header or `X-Forwarded-For` header indicating remote origin

**File:** `middleware.ts` (new file at project root)

```typescript
import { NextRequest, NextResponse } from "next/server";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function middleware(req: NextRequest) {
  // Only guard API routes
  if (!req.nextUrl.pathname.startsWith("/api")) return NextResponse.next();

  const host = req.headers.get("host")?.split(":")[0] ?? "";
  const forwarded = req.headers.get("x-forwarded-for");

  // Block if forwarded header is set (behind proxy sending external IP)
  if (forwarded) {
    const clientIp = forwarded.split(",")[0].trim();
    if (!LOCAL_HOSTS.has(clientIp) && !clientIp.startsWith("127.") && clientIp !== "::1") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Block non-local Host headers (defense-in-depth against DNS rebinding)
  if (host && !LOCAL_HOSTS.has(host) && !host.startsWith("192.168.") && !host.startsWith("10.")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
```

> **Note to user:** If you access the app from another machine on your LAN (not just localhost), we need to discuss expanding the allowed-host range. Ask if that's needed before implementing.

---

### Step 5 — Security headers via next.config.ts

**File:** `next.config.ts`

Add a `headers()` function to inject security headers on every response:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options",    value: "nosniff" },
        { key: "X-Frame-Options",           value: "DENY" },
        { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-eval needed for Mermaid
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "connect-src 'self'",
            "font-src 'self'",
            "frame-ancestors 'none'",
          ].join("; "),
        },
      ],
    },
  ];
},
```

---

### Step 6 — Input validation: parseInt NaN checks + URL scheme guard

**All API routes using `parseInt(id)`:** add this guard immediately after parsing:

```typescript
const id = parseInt(params.id, 10);
if (isNaN(id) || id <= 0) {
  return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
}
```

Files to update: `app/api/docs/[id]/route.ts`, `app/api/feeds/[id]/route.ts`, `app/api/projects/[id]/route.ts`, `app/api/projects/[id]/items/route.ts`, `app/api/projects/[id]/items/[itemId]/route.ts`

**URL scheme validation in fetcher.ts** — before inserting any URL field into the DB, verify it is `http:` or `https:` only (reuse the `validateFeedUrl` helper from Step 2).

**News item link rendering** — in `app/components/NewsFeed.tsx`, sanitize `href` to prevent `javascript:` URIs:

```typescript
// helper
function safeHref(url: string): string {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : "#";
  } catch { return "#"; }
}
// usage
<a href={safeHref(item.url)} target="_blank" rel="noopener noreferrer">
```

---

### Step 7 — Request body size limit for Docs API

**File:** `app/api/docs/route.ts` and `app/api/docs/[id]/route.ts`

Add a size check after parsing the body:

```typescript
const raw = await request.text();
if (raw.length > 5 * 1024 * 1024) {   // 5 MB limit
  return NextResponse.json({ error: "Request too large" }, { status: 413 });
}
const body = JSON.parse(raw);
```

---

### Step 8 — Protect startup-revalidate endpoint

**File:** `app/api/startup-revalidate/route.ts`

Add a check that the call only originates internally (from `docker-entrypoint.sh` or Next.js startup):

```typescript
const secret = process.env.REVALIDATE_SECRET;
const provided = request.headers.get("x-revalidate-secret");
if (secret && provided !== secret) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

Set `REVALIDATE_SECRET` in `.env.local` (not committed). Update `docker-entrypoint.sh` to pass the header when calling this endpoint.

---

### Step 9 — Docker: add non-root user

**File:** `Dockerfile`

In the final `runner` stage, before `CMD`:

```dockerfile
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
USER nextjs
```

Ensure the `db/` volume mount directory is writable by this user (update `docker-compose.yml` if needed).

---

### Step 10 — Fix silent errors in doc-files.ts

**File:** `lib/doc-files.ts`

Replace silent catch blocks:
```typescript
} catch (err) {
  console.error("[doc-files] writeDocFile failed:", err);
}
```

---

## Upload to Docs

After implementation, POST the plan to the Docs module:
```
POST /api/docs
{
  "title": "Plan: Security Hardening",
  "tags": "planning,security",
  "projectId": 1,
  "content": "<this file's content>"
}
```

---

## Verification

1. **npm audit** — run `npm audit` after `npm audit fix`; confirm 0 high vulnerabilities remain.
2. **SSRF** — attempt to create a feed source with URL `http://localhost:3000/api/settings`; confirm `400` is returned.
3. **Mermaid XSS** — create a doc with a mermaid block containing `<script>alert(1)</script>`; confirm it doesn't execute.
4. **Security headers** — open browser DevTools → Network tab; confirm `X-Content-Type-Options`, `X-Frame-Options`, and `Content-Security-Policy` appear on page responses.
5. **parseInt validation** — call `DELETE /api/docs/abc` via curl; confirm `400` response.
6. **news URL sanitization** — seed a news item with URL `javascript:alert(1)`; confirm it renders as `#` or is blocked.
7. **Body size limit** — POST >5MB to `/api/docs`; confirm `413` response.
8. **Docker** — run `docker compose up --build`; confirm container process runs as non-root with `docker exec <container> id`.
9. **Lint** — `npm run lint` passes with 0 errors after all changes.
