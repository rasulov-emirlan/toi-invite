import { NextResponse } from "next/server";
import { savePhoto, MAX_UPLOAD_BYTES } from "@/lib/photos";
import { isPhotoReferenced } from "@/lib/db";
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

  // Reject oversized bodies BEFORE formData() buffers them. Browsers always
  // send Content-Length for FormData; Traefik's buffering middleware
  // (docker-compose labels) is the backstop for chunked bodies without one.
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
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

  const result = await savePhoto(Buffer.from(await file.arrayBuffer()), isPhotoReferenced);
  if (!result.ok) {
    if (result.reason === "busy") {
      return NextResponse.json(
        { error: "busy" },
        { status: 503, headers: { "Retry-After": "5" } },
      );
    }
    if (result.reason === "quota") {
      return NextResponse.json({ error: "storage full" }, { status: 507 });
    }
    return NextResponse.json({ error: "not an image" }, { status: 415 });
  }
  return NextResponse.json({ id: result.id }, { status: 201 });
}
