import { readPhoto } from "@/lib/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photo = await readPhoto(id);
  if (!photo) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(photo), {
    headers: {
      "Content-Type": "image/jpeg",
      // Ids are single-use random handles; the bytes behind one never change.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
