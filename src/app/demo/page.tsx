import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, translator, DEFAULT_LOCALE } from "@/lib/i18n";
import { getTemplate, paletteVars } from "@/lib/templates";
import { getEventType } from "@/lib/events";
import type { InviteDisplay, Locale } from "@/lib/types";
import InviteCard from "@/components/InviteCard";
import GiftList from "@/components/GiftList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Пример приглашения — Той-Invite",
  robots: { index: false, follow: false },
};

/** A sample wedding ~6 weeks out, so the countdown always looks alive. */
function sampleInvite(locale: Locale): InviteDisplay {
  const d = new Date();
  d.setDate(d.getDate() + 45);
  const iso = d.toISOString().slice(0, 10);
  const deadline = new Date(d);
  deadline.setDate(deadline.getDate() - 7);
  return {
    slug: "demo",
    event_type: "wedding",
    template: "ornament_gold",
    locale,
    honoree: "Азамат",
    partner: "Айпери",
    event_date: iso,
    event_time: "17:00",
    venue_name: "Той-хан «Ала-Тоо», Бишкек",
    venue_map_url: "https://2gis.kg/bishkek",
    greeting: getEventType("wedding").defaultGreeting[locale],
    greeting_ru: getEventType("wedding").defaultGreeting.ru,
    greeting_ky: getEventType("wedding").defaultGreeting.ky,
    host_phone: "+996555123456",
    landmark:
      locale === "ky"
        ? "Филармониянын жанында, чыгыш кире бериши"
        : "Рядом с филармонией, восточный вход",
    rsvp_deadline: deadline.toISOString().slice(0, 10),
    dress_code: locale === "ky" ? "Салтанаттуу кийим" : "Нарядная одежда",
    program_json: JSON.stringify(
      locale === "ky"
        ? [
            { time: "17:00", title: "Меймандарды тосуу" },
            { time: "18:00", title: "Салтанаттуу бөлүк" },
            { time: "19:30", title: "Бий жана концерт" },
          ]
        : [
            { time: "17:00", title: "Встреча гостей" },
            { time: "18:00", title: "Торжественная часть" },
            { time: "19:30", title: "Танцы и концерт" },
          ],
    ),
    photo_id: null,
  };
}

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
        <Link href={`/create?lang=${locale}`} className="btn">
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
