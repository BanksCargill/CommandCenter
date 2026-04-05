import { NextRequest, NextResponse } from "next/server";

/**
 * Localhost-origin guard for API routes.
 *
 * This app is a single-user local deployment. All API access should come from
 * the same machine. This middleware rejects requests that carry an
 * X-Forwarded-For header pointing to a non-local address, which would indicate
 * a request routed through a proxy from an external client.
 *
 * It also rejects requests with a Host header that doesn't match known local
 * hostnames, providing defense-in-depth against DNS rebinding attacks.
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (LOCAL_HOSTNAMES.has(trimmed)) return true;
  if (trimmed.startsWith("127.")) return true;
  if (trimmed === "::1") return true;
  return false;
}

export function middleware(req: NextRequest) {
  // Only guard API routes
  if (!req.nextUrl.pathname.startsWith("/api")) return NextResponse.next();

  // Block if X-Forwarded-For header indicates external origin
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const clientIp = forwarded.split(",")[0].trim();
    if (!isLocalIp(clientIp)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // DNS rebinding guard: reject non-local Host headers
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  if (host && !LOCAL_HOSTNAMES.has(host)) {
    // Allow LAN access (192.168.x.x, 10.x.x.x) — remove these lines
    // if you want strictly localhost-only access.
    const isLan =
      /^192\.168\.\d+\.\d+$/.test(host) ||
      /^10\.\d+\.\d+\.\d+$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);
    if (!isLan) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
