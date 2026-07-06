import type { Metadata } from "next";
import Link from "next/link";
import { getInvite } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { sanitizeGuestName } from "@/lib/personalize";
import { whatsappShareUrl } from "@/lib/share";
import { isLocale, translator } from "@/lib/i18n";
import { getTemplate } from "@/lib/templates";
import { eventInstant, googleCalendarUrl } from "@/lib/calendar";
import {
  displayNames,
  eventLabel,
  formatEventDate,
  inviteTitle,
  ogDescription,
  toCalendarEvent,
} from "@/lib/invite-view";
import type { Locale } from "@/lib/types";
import Countdown from "./Countdown";
import RsvpForm from "./RsvpForm";

export const dynamic = "force-dynamic";

async function resolve(
  params: Promise<{ slug: string }>,
  searchParams?: Promise<{ lang?: string }>,
) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  if (!isValidSlug(slug)) return null;
  const invite = getInvite(slug);
  if (!invite) return null;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : invite.locale;
  return { invite, locale, slug };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const r = await resolve(params, searchParams);
  if (!r) return { title: "Той-Invite" };
  const { invite, locale } = r;
  const tpl = getTemplate(invite.template);
  const title = inviteTitle(invite, locale);
  const description = ogDescription(invite, locale);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: tpl.ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [tpl.ogImage],
    },
  };
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string; to?: string }>;
}) {
  const r = await resolve(params, searchParams);
  if (!r) {
    return <NotFound />;
  }
  const { invite, locale, slug } = r;
  const guestName = sanitizeGuestName((await searchParams).to);
  const tr = translator(locale);
  const tpl = getTemplate(invite.template);
  const other: Locale = locale === "ru" ? "ky" : "ru";
  const names = displayNames(invite, locale);
  const { start } = eventInstant(invite.event_date, invite.event_time);
  const toQuery = guestName ? `&to=${encodeURIComponent(guestName)}` : "";
  // Absolute, un-personalized invite URL for forwarding via WhatsApp.
  const shareBase = process.env.APP_BASE_URL ?? "";
  const shareUrl = whatsappShareUrl(tr("create.share_text"), `${shareBase}/i/${slug}`);

  const paletteStyle = {
    ["--ac" as string]: tpl.palette.accent,
    ["--soft" as string]: tpl.palette.accentSoft,
    ["--tbg" as string]: tpl.palette.bg,
    ["--tink" as string]: tpl.palette.ink,
    ["--tmuted" as string]: tpl.palette.muted,
    ["--tsurface" as string]: tpl.palette.surface,
  } as React.CSSProperties;

  const heroStyle: React.CSSProperties = {
    backgroundImage: `url(${tpl.heroImage})`,
  };

  return (
    <div className="invite" style={paletteStyle}>
      <div className="invite__lang">
        <Link href={`/i/${slug}?lang=${other}${toQuery}`}>
          {other === "ky" ? "Кыргызча" : "Русский"}
        </Link>
      </div>

      <div className="invite__inner">
        <article className="invite__card">
          <div className="invite__hero" style={heroStyle}>
            <span className="invite__event">{eventLabel(invite, locale)}</span>
            <h1 className="invite__names">
              {invite.partner ? (
                <>
                  {invite.honoree}
                  <span className="invite__amp">
                    {locale === "ky" ? "жана" : "и"}
                  </span>
                  {invite.partner}
                </>
              ) : (
                invite.honoree
              )}
            </h1>
          </div>

          <div className="invite__body">
            {guestName && (
              <p className="invite__salutation">
                {tr("invite.salutation").replace("{name}", guestName)}
              </p>
            )}
            {invite.greeting && (
              <p className="invite__greeting">{invite.greeting}</p>
            )}

            <Countdown targetMs={start.getTime()} locale={locale} />

            <div className="detail">
              <span className="detail__label">{tr("invite.when")}</span>
              <span className="detail__value">
                {formatEventDate(invite.event_date, locale)}, {invite.event_time}
              </span>
            </div>
            <div className="detail">
              <span className="detail__label">{tr("invite.where")}</span>
              <span className="detail__value">
                {invite.venue_name}
                {invite.venue_map_url && (
                  <>
                    {" — "}
                    <a href={invite.venue_map_url} target="_blank" rel="noopener noreferrer">
                      {tr("invite.open_map")}
                    </a>
                  </>
                )}
              </span>
            </div>

            <div className="actions">
              <a
                className="btn-ac"
                href={googleCalendarUrl(toCalendarEvent(invite, locale))}
                target="_blank"
                rel="noopener noreferrer"
              >
                📅 {tr("invite.add_to_calendar")}
              </a>
              <a className="btn-ac" href={`/api/ics/${slug}?lang=${locale}`}>
                ⬇ .ics
              </a>
            </div>

            <RsvpForm slug={slug} locale={locale} initialName={guestName} />
          </div>

          <div className="invite__foot">
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              {tr("invite.share")}
            </a>
            {" · "}
            {names} · <Link href="/">Той·Invite</Link>
          </div>
        </article>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <main className="wrap wrap--narrow" style={{ paddingTop: "6rem", textAlign: "center" }}>
      <span className="kicker kicker--red">404</span>
      <h1 style={{ margin: "1rem 0" }}>Чакыруу табылган жок / Приглашение не найдено</h1>
      <p style={{ color: "var(--gray-500)" }}>
        Возможно, ссылка неверна. · Балким шилтеме туура эмес.
      </p>
      <p style={{ marginTop: "2rem" }}>
        <Link href="/" className="btn">
          Той·Invite →
        </Link>
      </p>
    </main>
  );
}
