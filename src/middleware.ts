import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * The root layout can't see searchParams, but `<html lang>` must follow the
 * ?lang toggle — Kyrgyz pages announcing lang="ru" mispronounce everything in
 * a screen reader. Copy the validated param into a request header the layout
 * can read. (Invite pages additionally set lang on their own subtree from the
 * invite's stored locale.)
 */
export function middleware(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang");
  const headers = new Headers(req.headers);
  // Always strip the inbound header — it is ours to set, never the client's.
  headers.delete("x-ui-lang");
  if (lang === "ru" || lang === "ky") headers.set("x-ui-lang", lang);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Pages only — skip static assets and API routes.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
