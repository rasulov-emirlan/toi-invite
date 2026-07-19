import type { Metadata } from "next";
import { cache } from "react";
import { preload } from "react-dom";
import Link from "next/link";
import { getInvite, listGifts } from "@/lib/db";
import { logPageView } from "@/lib/pageview";
import { BASE_URL } from "@/lib/base-url";
import { GUEST_LINK_TOKEN_RE } from "@/lib/validation";
import StampOpen from "@/components/StampOpen";
import { toGuestGifts } from "@/lib/gifts";
import { isValidSlug } from "@/lib/slug";
import { sanitizeGuestName } from "@/lib/personalize";
import { isLocale, translator } from "@/lib/i18n";
import { getTemplate, paletteVars } from "@/lib/templates";
import { inviteTitle, ogDescription } from "@/lib/invite-view";
import type { Locale } from "@/lib/types";
import InviteCard from "@/components/InviteCard";
import GiftList from "@/components/GiftList";

export const dynamic = "force-dynamic";

// generateMetadata and the page body both need the invite — one query per
// request, not two.
const cachedGetInvite = cache(getInvite);

async function resolve(
  params: Promise<{ slug: string }>,
  searchParams?: Promise<{ lang?: string }>,
) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  if (!isValidSlug(slug)) return null;
  const invite = cachedGetInvite(slug);
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
  const { invite, locale, slug } = r;
  const title = inviteTitle(invite, locale);
  const description = ogDescription(invite, locale);
  // Per-invite OG card (names + date rendered into the image) — this is what
  // makes the link unfurl look hand-made in WhatsApp instead of a blank frame.
  const ogUrl = `/api/og/${slug}?lang=${locale}`;
  return {
    title,
    description,
    // Personal data (names, date, venue) — keep out of search indexes. OG
    // crawlers don't honor robots meta, so WhatsApp/TG unfurls still work.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string; to?: string; g?: string }>;
}) {
  const r = await resolve(params, searchParams);
  if (!r) {
    return <NotFound />;
  }
  const { invite, locale, slug } = r;
  const sp = await searchParams;
  const guestName = sanitizeGuestName(sp.to);

  // Personal links carry ?g=<guest capability token>. The "opened" stamp is
  // client-side (StampOpen beacon) — WhatsApp/Telegram preview crawlers fetch
  // these URLs and must not mark a guest as having opened anything.
  const invitedGuest = GUEST_LINK_TOKEN_RE.test(sp.g ?? "") ? (sp.g as string) : null;
  await logPageView("invite_view", slug);
  const tpl = getTemplate(invite.template);
  // The template art is the LCP element (CSS background, invisible to the
  // browser's preload scanner).
  preload(tpl.heroImage, { as: "image" });
  const other: Locale = locale === "ru" ? "ky" : "ru";
  const toQuery =
    (guestName ? `&to=${encodeURIComponent(guestName)}` : "") +
    (invitedGuest ? `&g=${invitedGuest}` : "");
  // Absolute, un-personalized invite URL for forwarding via WhatsApp — a
  // forwarded link must never be relative.
  const shareBase = BASE_URL;
  // "yours" is per-browser; the server always renders false and the client
  // recovers its own reservations after mount.
  const gifts = toGuestGifts(listGifts(slug), null);

  const paletteStyle = paletteVars(tpl) as React.CSSProperties;

  return (
    <div className="invite" lang={locale} style={paletteStyle}>
      <div className="invite__lang">
        <Link href={`/i/${slug}?lang=${other}${toQuery}`}>
          {other === "ky" ? "Кыргызча" : "Русский"}
        </Link>
      </div>

      {invitedGuest && <StampOpen slug={slug} guest={invitedGuest} />}
      <div className="invite__inner">
        <InviteCard
          invite={invite}
          locale={locale}
          mode="live"
          slug={slug}
          guestName={guestName || undefined}
          invitedGuest={invitedGuest ?? undefined}
          shareBase={shareBase}
          giftsSlot={
            gifts.length > 0 ? (
              <GiftList slug={slug} locale={locale} initial={gifts} />
            ) : undefined
          }
        />
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
