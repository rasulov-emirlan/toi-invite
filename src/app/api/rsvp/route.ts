import { NextResponse } from "next/server";
import { validateRsvp } from "@/lib/validation";
import { isValidSlug } from "@/lib/slug";
import { addRsvp } from "@/lib/db";
import type { RsvpInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body extends RsvpInput {
  slug?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!isValidSlug(body.slug)) {
    return NextResponse.json({ error: "bad slug" }, { status: 400 });
  }

  const result = validateRsvp(body);
  if (!result.ok) {
    return NextResponse.json({ error: "validation", fields: result.errors }, { status: 400 });
  }

  try {
    const ok = addRsvp(body.slug, result.value);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("addRsvp failed", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
