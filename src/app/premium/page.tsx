import Link from "next/link";
import type { Metadata } from "next";
import { DEFAULT_LOCALE, isLocale, translator } from "@/lib/i18n";
import { TEMPLATES } from "@/lib/templates";
import type { Locale } from "@/lib/types";
import PremiumOrder from "./PremiumOrder";

export const metadata: Metadata = {
  title: "Премиум · Той-Invite",
  description:
    "Именные приглашения для каждого гостя, премиум-шаблоны и экспорт для тамады. Оплата в сомах через mbank.",
};

export default async function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const tr = translator(locale);
  const other: Locale = locale === "ru" ? "ky" : "ru";

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <Link href={`/?lang=${locale}`} className="brand">
            Той<b>·</b>Invite
          </Link>
          <Link
            href={`/premium?lang=${other}`}
            className="kicker"
            style={{ textDecoration: "none" }}
          >
            {other === "ky" ? "Кыргызча" : "Русский"} →
          </Link>
        </div>
      </header>

      <main className="wrap">
        <div className="page-head">
          <span className="kicker kicker--red">{tr("premium.kicker")}</span>
          <h1>{tr("premium.title")}</h1>
          <p style={{ color: "var(--gray-500)", margin: 0, maxWidth: "54ch" }}>
            {tr("premium.subtitle")}
          </p>
        </div>

        {/* Show the actual goods before asking for a phone number — a
            willingness-to-pay signal is only real when people can see what
            the templates look like. */}
        <section className="section" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <span className="kicker kicker--red">{tr("premium.examples_kicker")}</span>
          <h2>{tr("premium.examples_title")}</h2>
          <p style={{ color: "var(--gray-500)", maxWidth: "60ch" }}>
            {tr("premium.examples_hint")}
          </p>
          <div className="tpl-gallery">
            {TEMPLATES.map((tpl) => (
              <div className="tpl-gallery__item" key={tpl.key}>
                <div
                  className="tpl-gallery__art"
                  style={{ backgroundImage: `url(${tpl.heroImage})` }}
                />
                <span className="tpl-gallery__name" style={{ color: tpl.palette.accent }}>
                  {tpl.names[locale]}
                </span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: "1rem" }}>
            <Link href={`/demo?lang=${locale}`} className="btn btn--ghost">
              {tr("premium.examples_demo")}
            </Link>
          </p>
        </section>

        <PremiumOrder locale={locale} />
      </main>

      <footer className="footer">
        <div className="wrap">{tr("landing.footer")}</div>
      </footer>
    </>
  );
}
