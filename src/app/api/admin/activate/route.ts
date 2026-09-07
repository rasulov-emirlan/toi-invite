import { NextResponse } from "next/server";
import { getInvite, logEvent, setInvitePremium } from "@/lib/db";
import { isAdminToken } from "@/lib/admin";
import { isOrderableTier } from "@/lib/premium";
import { isValidSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Turn on a paid tier without going through Finik — the operator has been
 * paid by mbank transfer. Same ADMIN_TOKEN gate as the other operator
 * surfaces, and the activation is logged as its own event so manual revenue
 * shows up in the funnel next to card payments instead of vanishing.
 */
export async function POST(req: Request) {
  let body: { token?: unknown; slug?: unknown; tier?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!isAdminToken(body.token)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isValidSlug(body.slug)) {
    return NextResponse.json({ error: "validation", fields: ["slug"] }, { status: 400 });
  }
  // A tier that can't be ordered can't be granted either — otherwise the free
  // tier could be "activated" onto an invite and mean nothing.
  if (!isOrderableTier(body.tier)) {
    return NextResponse.json({ error: "validation", fields: ["tier"] }, { status: 400 });
  }
  const slug = body.slug;
  const tier = body.tier;
  if (!getInvite(slug)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!setInvitePremium(slug, tier)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  logEvent("payment_succeeded", slug, `manual:${tier}`);
  return NextResponse.json({ ok: true });
}
