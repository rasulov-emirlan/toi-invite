import Link from "next/link";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, translator } from "@/lib/i18n";
import { listInvitesByOrganizerRef } from "@/lib/db";
import { displayNames, eventLabel } from "@/lib/invite-view";
import type { Locale } from "@/lib/types";
import MyInvites from "@/components/MyInvites";

export const dynamic = "force-dynamic";

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const tr = translator(locale);
  const other: Locale = locale === "ru" ? "ky" : "ru";
  const createHref = `/create?lang=${locale}`;

  // Server-side "Мои приглашения": the HttpOnly organizer cookie survives a
  // cleared localStorage, so recovery no longer depends on browser storage.
  const orgRef = (await cookies()).get("toi_org")?.value;
  const serverInvites = orgRef
    ? listInvitesByOrganizerRef(orgRef).map((inv) => ({
        slug: inv.slug,
        token: inv.organizer_token,
        title: `${eventLabel(inv, inv.locale)} · ${displayNames(inv, inv.locale)}`,
        createdAt: inv.created_at,
      }))
    : [];

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <Link href={`/?lang=${locale}`} className="brand">
            Той<b>·</b>Invite
          </Link>
          <Link
            href={`/?lang=${other}`}
            className="kicker"
            style={{ textDecoration: "none" }}
          >
            {other === "ky" ? "Кыргызча" : "Русский"} →
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <span className="kicker" style={{ color: "#bdbdbd" }}>
            {tr("landing.kicker")}
          </span>
          <h1>{tr("landing.title")}</h1>
          <p>{tr("landing.subtitle")}</p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href={createHref} className="btn">
              {tr("landing.cta")} →
            </Link>
            <Link href={`/demo?lang=${locale}`} className="btn btn--outline-light">
              {tr("landing.demo_cta")}
            </Link>
          </div>
        </div>
      </section>

      <MyInvites locale={locale} serverInvites={serverInvites} />

      <section className="section">
        <div className="wrap">
          <span className="kicker kicker--red">{tr("landing.how_kicker")}</span>
          <h2>{tr("landing.how_title")}</h2>
          <div className="grid3">
            <div className="card">
              <span className="card__num">01</span>
              <h3>{tr("landing.step1_title")}</h3>
              <p>{tr("landing.step1_body")}</p>
            </div>
            <div className="card">
              <span className="card__num">02</span>
              <h3>{tr("landing.step2_title")}</h3>
              <p>{tr("landing.step2_body")}</p>
            </div>
            <div className="card">
              <span className="card__num">03</span>
              <h3>{tr("landing.step3_title")}</h3>
              <p>{tr("landing.step3_body")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="kicker kicker--red">
            {tr("landing.features_kicker")}
          </span>
          <h2>{tr("landing.features_title")}</h2>
          <ul className="featurelist">
            <li>{tr("landing.feature_bilingual")}</li>
            <li>{tr("landing.feature_events")}</li>
            <li>{tr("landing.feature_rsvp")}</li>
            <li>{tr("landing.feature_share")}</li>
            <li>{tr("landing.feature_som")}</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="kicker kicker--red">
            {tr("landing.pricing_kicker")}
          </span>
          <h2>0 сом</h2>
          <div className="pricing">
            <p style={{ margin: 0 }}>{tr("landing.pricing_note")}</p>
            <div
              style={{
                marginTop: "1.5rem",
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <Link href={createHref} className="btn">
                {tr("landing.cta")} →
              </Link>
              <Link href={`/premium?lang=${locale}`} className="btn btn--ghost">
                {tr("landing.pricing_cta")} ✦
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">{tr("landing.footer")}</div>
      </footer>
    </>
  );
}
