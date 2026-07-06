import { NextResponse } from "next/server";
import { validateInvite } from "@/lib/validation";
import { createInvite } from "@/lib/db";
import type { InviteInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
