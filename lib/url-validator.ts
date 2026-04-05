/**
 * Shared API validation helpers.
 *
 * - parseId: parse a route segment as a positive integer, returning null on failure.
 * - validateFeedUrl: SSRF guard for user-supplied feed URLs.
 * - safeHref: strips dangerous URI schemes before rendering links.
 */

/**
 * Parse a URL route segment (e.g. params.id) as a positive integer.
 * Returns null when the segment is missing, non-numeric, or <= 0.
 */
export function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

const BLOCKED_PATTERNS = [
  // Loopback
  /^https?:\/\/localhost([:\/]|$)/i,
  /^https?:\/\/127\.\d+\.\d+\.\d+([:\/]|$)/,
  /^https?:\/\/\[?::1\]?([:\/]|$)/,
  /^https?:\/\/0\.0\.0\.0([:\/]|$)/,
  // RFC-1918 private ranges
  /^https?:\/\/10\.\d+\.\d+\.\d+([:\/]|$)/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+([:\/]|$)/,
  /^https?:\/\/192\.168\.\d+\.\d+([:\/]|$)/,
  // Link-local / AWS metadata endpoint
  /^https?:\/\/169\.254\.\d+\.\d+([:\/]|$)/,
];

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFeedUrl(raw: string): UrlValidationResult {
  if (!raw || typeof raw !== "string") {
    return { valid: false, error: "URL is required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "Only http and https URLs are allowed" };
  }

  if (BLOCKED_PATTERNS.some((p) => p.test(raw))) {
    return { valid: false, error: "Private or loopback addresses are not allowed" };
  }

  return { valid: true };
}

/**
 * Returns a safe href for rendering — strips javascript:/data:/vbscript: etc.
 * Returns "#" for anything that isn't http or https.
 */
export function safeHref(url: string): string {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : "#";
  } catch {
    return "#";
  }
}
