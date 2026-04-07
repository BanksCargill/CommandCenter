import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "crypto";

// Called by docker-entrypoint.sh once the server is up.
// Busts the Full Route Cache for pages using revalidate=false so the first
// user request renders from the live DB instead of build-time seed data.
//
// Protected by REVALIDATE_SECRET env var when set — pass the secret in the
// X-Revalidate-Secret request header (docker-entrypoint.sh does this).
//
// When adding a new module with revalidate=false, add its path here.
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (secret) {
    const provided = request.headers.get("x-revalidate-secret") ?? "";
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    const match = a.length === b.length && timingSafeEqual(a, b);
    if (!match) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/docs");
  revalidatePath("/chelsea");
  console.log("[startup] Revalidated /, /projects, /docs, /chelsea");
  return NextResponse.json({ ok: true });
}
