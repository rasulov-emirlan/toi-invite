import { NextResponse } from "next/server";
import { savePhoto, MAX_UPLOAD_BYTES } from "@/lib/photos";
import { clientKey, photoUploadLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = photoUploadLimiter.check(clientKey(req, "photo"), Date.now());
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let file: unknown;
  try {
    const form = await req.formData();
    file = form.get("file");
  } catch {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  const id = await savePhoto(Buffer.from(await file.arrayBuffer()));
  if (!id) return NextResponse.json({ error: "not an image" }, { status: 415 });
  return NextResponse.json({ id }, { status: 201 });
}
