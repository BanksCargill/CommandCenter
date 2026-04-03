import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Called by docker-entrypoint.sh once the server is up.
// Busts the Full Route Cache for pages using revalidate=false so the first
// user request renders from the live DB instead of build-time seed data.
//
// When adding a new module with revalidate=false, add its path here.
export async function POST() {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/docs");
  console.log("[startup] Revalidated /, /projects, /docs");
  return NextResponse.json({ ok: true });
}
