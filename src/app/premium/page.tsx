import Link from "next/link";
import type { Metadata } from "next";
import { DEFAULT_LOCALE, isLocale, translator } from "@/lib/i18n";
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

        <PremiumOrder locale={locale} />
      </main>

      <footer className="footer">
        <div className="wrap">{tr("landing.footer")}</div>
      </footer>
    </>
  );
}
