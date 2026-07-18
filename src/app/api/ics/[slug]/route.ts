import { getInvite, logEvent } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { isLocale } from "@/lib/i18n";
import { icsContent } from "@/lib/calendar";
import { toCalendarEvent } from "@/lib/invite-view";
import type { Locale } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return new Response("bad request", { status: 400 });

  const invite = getInvite(slug);
  if (!invite) return new Response("not found", { status: 404 });

  const url = new URL(req.url);
  const langParam = url.searchParams.get("lang");
  const locale: Locale = isLocale(langParam) ? langParam : invite.locale;

  logEvent("ics_download", slug);
  const ics = icsContent(toCalendarEvent(invite, locale), `${slug}@toi-invite`);
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="toi-${slug}.ics"`,
    },
  });
}
