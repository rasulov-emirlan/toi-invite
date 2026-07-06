import { NextResponse } from "next/server";
import { validateInvite } from "@/lib/validation";
import { createInvite } from "@/lib/db";
import { clientKey, inviteLimiter } from "@/lib/ratelimit";
import type { InviteInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    const { slug, token } = createInvite(result.value);
    return NextResponse.json({ slug, token }, { status: 201 });
  } catch (err) {
    console.error("createInvite failed", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
