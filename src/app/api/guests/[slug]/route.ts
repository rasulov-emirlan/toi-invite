import { NextResponse } from "next/server";
import {
  addInvitedGuest,
  deleteInvitedGuest,
  getInvite,
  listGuestBoard,
} from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { LIMITS } from "@/lib/validation";
import { tokensMatch } from "@/lib/token";
import { clientKey, inviteEditLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  token?: string;
  op?: string;
  name?: string;
  id?: number;
}


/** Organizer guest-list management: add / remove invited guests. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = inviteEditLimiter.check(clientKey(req, "guest-edit"), Date.now());
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
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const invite = getInvite(slug);
  if (!invite || !tokensMatch(body.token, invite.organizer_token)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (body.op === "add") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 1 || name.length > LIMITS.guestName) {
      return NextResponse.json({ error: "validation", fields: ["name"] }, { status: 400 });
    }
    const id = addInvitedGuest(slug, name);
    if (id == null) return NextResponse.json({ error: "list full" }, { status: 409 });
    return NextResponse.json({ ok: true, id, guests: listGuestBoard(slug) }, { status: 201 });
  }

  if (body.op === "remove") {
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: "validation", fields: ["id"] }, { status: 400 });
    }
    if (!deleteInvitedGuest(slug, id)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, guests: listGuestBoard(slug) });
  }

  return NextResponse.json({ error: "validation", fields: ["op"] }, { status: 400 });
}
