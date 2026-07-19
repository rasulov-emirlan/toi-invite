import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, translator, DEFAULT_LOCALE } from "@/lib/i18n";
import { getTemplate, paletteVars } from "@/lib/templates";
import { sampleInvite } from "@/lib/sample-invite";
import type { Locale } from "@/lib/types";
import InviteCard from "@/components/InviteCard";
import GiftList from "@/components/GiftList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Пример приглашения — Той-Invite",
  robots: { index: false, follow: false },
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const other: Locale = locale === "ru" ? "ky" : "ru";
  const tr = translator(locale);
  const invite = sampleInvite(locale);
  const tpl = getTemplate(invite.template);

  return (
    <div className="invite" lang={locale} style={paletteVars(tpl) as React.CSSProperties}>
      <div className="demo-banner">
        <span className="kicker">{tr("demo.kicker")}</span>
        <Link href={`/create?lang=${locale}`} className="btn btn--outline-light">
          {tr("landing.cta")} →
        </Link>
      </div>

      <div className="invite__lang">
        <Link href={`/demo?lang=${other}`}>
          {other === "ky" ? "Кыргызча" : "Русский"}
        </Link>
      </div>

      <div className="invite__inner">
        <InviteCard
          invite={invite}
          locale={locale}
          mode="demo"
          giftsSlot={
            <GiftList
              slug="demo"
              locale={locale}
              demo
              initial={[
                {
                  id: 1,
                  title: locale === "ky" ? "Чай сервизи" : "Чайный сервиз",
                  taken: false,
                  yours: false,
                },
                { id: 2, title: "Самовар", taken: true, yours: false },
                {
                  id: 3,
                  title: locale === "ky" ? "Жууркан-төшөк комплекти" : "Комплект постельного белья",
                  taken: false,
                  yours: false,
                },
              ]}
            />
          }
        />
      </div>
    </div>
  );
}
