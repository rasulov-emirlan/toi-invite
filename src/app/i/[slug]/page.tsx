import type { Metadata } from "next";
import Link from "next/link";
import { getInvite, listGifts } from "@/lib/db";
import { toGuestGifts } from "@/lib/gifts";
import { isValidSlug } from "@/lib/slug";
import { sanitizeGuestName } from "@/lib/personalize";
import { isLocale, translator } from "@/lib/i18n";
import { getTemplate } from "@/lib/templates";
import { inviteTitle, ogDescription } from "@/lib/invite-view";
import type { Locale } from "@/lib/types";
import InviteCard from "@/components/InviteCard";
import GiftList from "@/components/GiftList";

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
  const tpl = getTemplate(invite.template);
  const other: Locale = locale === "ru" ? "ky" : "ru";
  const toQuery = guestName ? `&to=${encodeURIComponent(guestName)}` : "";
  // Absolute, un-personalized invite URL for forwarding via WhatsApp. Same
  // absolute fallback as layout.tsx's metadataBase so a forwarded link is never
  // relative.
  const shareBase = process.env.APP_BASE_URL ?? "http://localhost:3000";
  // "yours" is per-browser; the server always renders false and the client
  // recovers its own reservations after mount.
  const gifts = toGuestGifts(listGifts(slug), null);

  const paletteStyle = {
    ["--ac" as string]: tpl.palette.accent,
    ["--soft" as string]: tpl.palette.accentSoft,
    ["--tbg" as string]: tpl.palette.bg,
    ["--tink" as string]: tpl.palette.ink,
    ["--tmuted" as string]: tpl.palette.muted,
    ["--tsurface" as string]: tpl.palette.surface,
  } as React.CSSProperties;

  return (
    <div className="invite" lang={locale} style={paletteStyle}>
      <div className="invite__lang">
        <Link href={`/i/${slug}?lang=${other}${toQuery}`}>
          {other === "ky" ? "Кыргызча" : "Русский"}
        </Link>
      </div>

      <div className="invite__inner">
        <InviteCard
          invite={invite}
          locale={locale}
          mode="live"
          slug={slug}
          guestName={guestName || undefined}
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
