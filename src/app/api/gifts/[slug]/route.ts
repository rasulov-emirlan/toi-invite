import { NextResponse } from "next/server";
import { addGift, deleteGift, getInvite, listGifts, unclaimGift } from "@/lib/db";
import { cleanGiftTitle } from "@/lib/gifts";
import { isValidSlug } from "@/lib/slug";
import { tokensMatch } from "@/lib/token";
import { clientKey, inviteEditLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  token?: string;
  op?: string;
  title?: string;
  id?: number;
}

/** Organizer wishlist management: add / remove / release a reservation. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = inviteEditLimiter.check(clientKey(req, "gift-edit"), Date.now());
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
    const title = cleanGiftTitle(body.title);
    if (!title) {
      return NextResponse.json({ error: "validation", fields: ["title"] }, { status: 400 });
    }
    const id = addGift(slug, title);
    if (id == null) return NextResponse.json({ error: "list full" }, { status: 409 });
    return NextResponse.json({ ok: true, gifts: listGifts(slug) }, { status: 201 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "validation", fields: ["id"] }, { status: 400 });
  }

  if (body.op === "remove") {
    if (!deleteGift(slug, id)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, gifts: listGifts(slug) });
  }

  if (body.op === "release") {
    if (!unclaimGift(slug, id, null, true)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, gifts: listGifts(slug) });
  }

  return NextResponse.json({ error: "validation", fields: ["op"] }, { status: 400 });
}
