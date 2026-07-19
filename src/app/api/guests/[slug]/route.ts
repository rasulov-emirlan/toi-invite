import { NextResponse } from "next/server";
import {
  addInvitedGuests,
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
  names?: unknown;
  id?: number;
}

/** One pasted list = one request = one rate-limit token (bounded per call;
 *  the 300-per-invite cap in addInvitedGuests still applies). */
const MAX_BULK_NAMES = 100;


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
    // Accept either one name or a pasted list — a loop of per-name requests
    // would eat the organizer's own rate limit halfway through a family list.
    const raw = Array.isArray(body.names)
      ? body.names
      : typeof body.name === "string"
        ? [body.name]
        : [];
    if (raw.length < 1 || raw.length > MAX_BULK_NAMES) {
      return NextResponse.json({ error: "validation", fields: ["names"] }, { status: 400 });
    }
    const names = raw
      .filter((n): n is string => typeof n === "string")
      .map((n) => n.trim())
      .filter(Boolean);
    // All-or-nothing on validity: silently dropping a too-long name from the
    // middle of a pasted list would desync the client's "what failed" math.
    if (names.length !== raw.length || names.some((n) => n.length > LIMITS.guestName)) {
      return NextResponse.json({ error: "validation", fields: ["name"] }, { status: 400 });
    }
    // Inserted in order — `added` tells the client exactly which tail was
    // dropped for capacity, so nothing is lost silently.
    const added = addInvitedGuests(slug, names);
    if (added === 0) return NextResponse.json({ error: "list full" }, { status: 409 });
    return NextResponse.json(
      { ok: true, added, guests: listGuestBoard(slug) },
      { status: 201 },
    );
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
