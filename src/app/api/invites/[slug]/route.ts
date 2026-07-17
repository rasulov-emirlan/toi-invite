import { NextResponse } from "next/server";
import { validateInvite } from "@/lib/validation";
import { getInvite, updateInvite } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { tokensMatch } from "@/lib/token";
import { clientKey, inviteEditLimiter } from "@/lib/ratelimit";
import type { InviteInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body extends InviteInput {
  token?: string;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = inviteEditLimiter.check(clientKey(req, "invite-edit"), Date.now());
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "bad slug" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  // JSON `null`/arrays/primitives parse fine but aren't a usable body.
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Same constant-time gate as the organizer dashboard: wrong token learns
  // nothing, including whether the slug exists.
  const invite = getInvite(slug);
  if (!invite || !tokensMatch(body.token, invite.organizer_token)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = validateInvite(body);
  if (!result.ok) {
    return NextResponse.json({ error: "validation", fields: result.errors }, { status: 400 });
  }

  try {
    const ok = updateInvite(slug, result.value);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("updateInvite failed", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
