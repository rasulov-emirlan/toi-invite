import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OPAQUE_REF_RE, validateInvite } from "@/lib/validation";
import { createInvite, logEvent } from "@/lib/db";
import { clientKey, inviteLimiter } from "@/lib/ratelimit";
import { generateToken } from "@/lib/slug";
import type { InviteInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Durable-enough organizer identity: an opaque HttpOnly cookie set on first
 * create. It groups invites from the same browser so "Мои приглашения" can be
 * served server-side even after localStorage is wiped. Not an account — a
 * phone-bound login can replace the value later without a schema change.
 */
const ORGANIZER_COOKIE = "toi_org";
const ORGANIZER_COOKIE_MAX_AGE = 60 * 60 * 24 * 730; // 2 years

export async function POST(req: Request) {
  const rl = inviteLimiter.check(clientKey(req, "invite"), Date.now());
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: InviteInput;
  try {
    body = (await req.json()) as InviteInput;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = validateInvite(body);
  if (!result.ok) {
    return NextResponse.json({ error: "validation", fields: result.errors }, { status: 400 });
  }

  const jar = await cookies();
  const existingRef = jar.get(ORGANIZER_COOKIE)?.value;
  const organizerRef = OPAQUE_REF_RE.test(existingRef ?? "")
    ? (existingRef as string)
    : generateToken();

  try {
    const { slug, token } = createInvite(result.value, organizerRef);
    logEvent("invite_created", slug, result.value.created_ref);
    const res = NextResponse.json({ slug, token }, { status: 201 });
    res.cookies.set(ORGANIZER_COOKIE, organizerRef, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ORGANIZER_COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("createInvite failed", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
