import type { Metadata } from "next";
import { statsSummary } from "@/lib/db";
import { isAdminToken } from "@/lib/admin";
import Forbidden from "@/components/Forbidden";

export const dynamic = "force-dynamic";

// Operator-only: never index, valid token or not.
export const metadata: Metadata = {
  title: "Статистика — Той-Invite",
  robots: { index: false, follow: false },
};

/**
 * Operator product dashboard: the funnel (views → RSVPs → new invites via the
 * viral loop) plus premium-lead volume, phone-readable. Same ADMIN_TOKEN gate
 * as /premium/leads.
 */
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!isAdminToken(token ?? null)) {
    return <Forbidden message="Доступ закрыт" />;
  }

  const s = statsSummary();

  return (
    <main className="wrap" style={{ paddingTop: "3rem", paddingBottom: "4rem" }}>
      <span className="kicker kicker--red">СТАТИСТИКА</span>
      <h1 style={{ margin: "0.5rem 0 2rem" }}>Той·Invite — продукт</h1>

      <div className="stats">
        <div className="stat">
          <span className="stat__num">{s.invites_total}</span>
          <span className="stat__label">Приглашений</span>
        </div>
        <div className="stat">
          <span className="stat__num">{s.rsvps_total}</span>
          <span className="stat__label">RSVP-ответов</span>
        </div>
        <div className="stat">
          <span className="stat__num">{s.created_via_ref}</span>
          <span className="stat__label">Созданы по ссылке (виральные)</span>
        </div>
        <div className="stat">
          <span className="stat__num">{s.premium_leads_total}</span>
          <span className="stat__label">
            <a href={`/premium/leads?token=${encodeURIComponent(token ?? "")}`}>
              Премиум-заявок →
            </a>
          </span>
        </div>
      </div>

      <h2 style={{ margin: "2.5rem 0 1rem" }}>События</h2>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Событие</th>
              <th>Всего</th>
              <th>За 7 дней</th>
            </tr>
          </thead>
          <tbody>
            {s.events.map((e) => (
              <tr key={e.name}>
                <td>{e.name}</td>
                <td>{e.total}</td>
                <td>{e.last7d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ margin: "2.5rem 0 1rem" }}>Топ приглашений (30 дней)</h2>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Ссылка</th>
              <th>Просмотров</th>
            </tr>
          </thead>
          <tbody>
            {s.top_invites.map((t) => (
              <tr key={t.slug}>
                <td>
                  <a href={`/i/${t.slug}`}>/i/{t.slug}</a>
                </td>
                <td>{t.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
