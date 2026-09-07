import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SID_COOKIE, SID_HEADER, isSid, newSid } from "@/lib/session";

/** Six months — long enough that a family planning a toi over several weeks
 *  stays one visitor across the whole funnel. */
const SID_MAX_AGE = 60 * 60 * 24 * 180;

/**
 * Two jobs, both invisible to the visitor:
 *
 * 1. The root layout can't see searchParams, but `<html lang>` must follow the
 *    ?lang toggle — Kyrgyz pages announcing lang="ru" mispronounce everything
 *    in a screen reader. Copy the validated param into a request header the
 *    layout can read. (Invite pages additionally set lang on their own subtree
 *    from the invite's stored locale.)
 * 2. Mint the anonymous analytics sid on first contact, and forward it as a
 *    request header so the components rendering *this* response can already
 *    attribute their events to it.
 */
export function middleware(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang");
  const headers = new Headers(req.headers);
  // Always strip the inbound headers — they are ours to set, never the client's.
  headers.delete("x-ui-lang");
  headers.delete(SID_HEADER);
  if (lang === "ru" || lang === "ky") headers.set("x-ui-lang", lang);

  const existing = req.cookies.get(SID_COOKIE)?.value;
  const sid = isSid(existing) ? existing : newSid();
  headers.set(SID_HEADER, sid);

  const res = NextResponse.next({ request: { headers } });
  if (sid !== existing) {
    res.cookies.set(SID_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: SID_MAX_AGE,
    });
  }
  return res;
}

export const config = {
  // Pages only — skip static assets and API routes.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
