import type { Metadata } from "next";
import { funnelCounts, statsSummary, vitalsP75 } from "@/lib/db";
import { isAdminToken } from "@/lib/admin";
import { FUNNEL_EVENTS, computeFunnel, formatRate, kFactor } from "@/lib/funnel";
import { formatVital, isVitalMetric, rateVital } from "@/lib/vitals";
import Forbidden from "@/components/Forbidden";

/** The reporting window for every rate on this page. Long enough that a toi
 *  planned over a few weekends stays inside one window. */
const WINDOW_DAYS = 30;

export const dynamic = "force-dynamic";

// Operator-only: never index, valid token or not.
export const metadata: Metadata = {
  title: "Статистика — Той-Invite",
  robots: { index: false, follow: false },
};

/**
 * Operator product dashboard, phone-readable. Leads with the five numbers that
 * each drive one decision, then the step funnel behind them, then Core Web
 * Vitals, then the raw event counts. Same ADMIN_TOKEN gate as /premium/leads.
 */
const RATING_RU: Record<string, string> = {
  good: "хорошо",
  "needs-improvement": "средне",
  poor: "плохо",
};

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
  const counts = funnelCounts(FUNNEL_EVENTS, WINDOW_DAYS);
  const funnel = computeFunnel(counts);
  const vitals = vitalsP75(WINDOW_DAYS);
  const visitors = counts.landing_view ?? 0;
  const inviteLcp = vitals.find((v) => v.metric === "LCP" && v.surface === "invite");

  // Each headline answers exactly one question, so a bad number points at a
  // decision instead of at a vibe.
  const headline: Array<{ value: string; label: string; asks: string }> = [
    {
      value: String(visitors),
      label: `Посетителей за ${WINDOW_DAYS} дней`,
      asks: "Работает ли хоть один канал?",
    },
    {
      value: formatRate(
        visitors === 0 ? null : (counts.invite_created ?? 0) / visitors,
      ),
      label: "Посетитель → приглашение",
      asks: "Не сложен ли конструктор?",
    },
    {
      value: formatRate(kFactor(s.invites_total, s.created_via_ref)),
      label: "K-фактор (приглашений с чужой ссылки)",
      asks: "Растёт ли продукт сам?",
    },
    {
      value: formatRate(
        (counts.premium_view ?? 0) === 0
          ? null
          : (counts.payment_succeeded ?? 0) / (counts.premium_view ?? 0),
      ),
      label: "Тарифы → оплата",
      asks: "Стоит ли премиум своих денег?",
    },
    {
      value: inviteLcp ? formatVital("LCP", inviteLcp.p75) : "—",
      label: "LCP приглашения (p75)",
      asks: "Успевает ли карточка открыться у гостя?",
    },
  ];

  return (
    <main className="wrap" style={{ paddingTop: "3rem", paddingBottom: "4rem" }}>
      <span className="kicker kicker--red">СТАТИСТИКА</span>
      <h1 style={{ margin: "0.5rem 0 2rem" }}>Той·Invite — продукт</h1>

      <div className="stats">
        {headline.map((h) => (
          <div className="stat" key={h.label}>
            <span className="stat__num">{h.value}</span>
            <span className="stat__label">{h.label}</span>
            <span className="stat__asks">{h.asks}</span>
          </div>
        ))}
      </div>

      <h2 style={{ margin: "2.5rem 0 0.5rem" }}>Воронка ({WINDOW_DAYS} дней)</h2>
      <p style={{ color: "var(--gray-500)", margin: "0 0 1rem", fontSize: "0.9rem" }}>
        Уникальные посетители, а не события. Гости приходят сразу по ссылке на
        приглашение, поэтому их шаги могут быть больше предыдущих — это трафик,
        а не ошибка.
      </p>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Шаг</th>
              <th>Кто</th>
              <th>Человек</th>
              <th>От прошлого</th>
              <th>От начала</th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((row) => (
              <tr key={row.event}>
                <td>{row.labels.ru}</td>
                <td style={{ color: "var(--gray-500)" }}>
                  {row.actor === "guest" ? "гость" : "организатор"}
                </td>
                <td>{row.visitors}</td>
                <td>{formatRate(row.fromPrev)}</td>
                <td>{formatRate(row.fromTop)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ margin: "2.5rem 0 0.5rem" }}>Скорость (Core Web Vitals, p75)</h2>
      <p style={{ color: "var(--gray-500)", margin: "0 0 1rem", fontSize: "0.9rem" }}>
        С реальных устройств гостей — в основном недорогие Android внутри
        WhatsApp. Порог «хорошо»: LCP ≤ 2.5 с, INP ≤ 200 мс, CLS ≤ 0.1.
      </p>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Метрика</th>
              <th>Страница</th>
              <th>p75</th>
              <th>Оценка</th>
              <th>Замеров</th>
            </tr>
          </thead>
          <tbody>
            {vitals.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--gray-500)" }}>
                  Пока нет замеров.
                </td>
              </tr>
            )}
            {vitals.map((v) => (
              <tr key={`${v.metric}:${v.surface}`}>
                <td>{v.metric}</td>
                <td>{v.surface}</td>
                <td>{isVitalMetric(v.metric) ? formatVital(v.metric, v.p75) : v.p75}</td>
                <td>{isVitalMetric(v.metric) ? RATING_RU[rateVital(v.metric, v.p75)] : "—"}</td>
                <td>{v.samples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ margin: "2.5rem 0 1rem" }}>
        Итоги: {s.invites_total} приглашений · {s.rsvps_total} RSVP ·{" "}
        <a href={`/premium/leads?token=${encodeURIComponent(token ?? "")}`}>
          {s.premium_leads_total} заявок →
        </a>
      </h2>

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
