import { getInvite, listRsvps } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { tokensMatch } from "@/lib/token";
import { rsvpsToCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return new Response("bad request", { status: 400 });

  const invite = getInvite(slug);
  const token = new URL(req.url).searchParams.get("token");
  // Same token gate as the organizer view — wrong/missing token reveals nothing.
  if (!invite || !tokensMatch(token, invite.organizer_token)) {
    return new Response("forbidden", { status: 403 });
  }

  const csv = rsvpsToCsv(listRsvps(slug), invite.locale);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="toi-${slug}-rsvps.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
