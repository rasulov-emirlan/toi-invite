import type { Metadata } from "next";
import { listRecentInvites } from "@/lib/db";
import { isAdminToken } from "@/lib/admin";
import { PREMIUM_TIERS } from "@/lib/premium";
import { formatKgTimestamp } from "@/lib/calendar";
import Forbidden from "@/components/Forbidden";
import ActivateForm from "./ActivateForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Активация — Той-Invite",
  robots: { index: false, follow: false },
};

/**
 * Operator-only manual activation.
 *
 * Finik checkout is blocked on two things only the operator can do (buy the
 * domain, register our RSA public key). Until then the only way to take money
 * is the way KG already works — an mbank transfer over WhatsApp — and this page
 * is what turns that transfer into an activated invite. It stays useful after
 * Finik goes live, for refunds, comps and payments that arrive out of band.
 */
export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!isAdminToken(token ?? null)) {
    return <Forbidden message="Доступ закрыт" />;
  }

  const invites = listRecentInvites();
  const tiers = PREMIUM_TIERS.filter((t) => t.orderable).map((t) => ({
    key: t.key,
    label: `${t.names.ru} · ${t.priceSom} сом`,
  }));

  return (
    <main className="wrap" style={{ paddingTop: "3rem", paddingBottom: "4rem" }}>
      <span className="kicker kicker--red">ОПЕРАТОР</span>
      <h1 style={{ margin: "0.5rem 0 0.5rem" }}>Активация тарифа вручную</h1>
      <p style={{ color: "var(--gray-500)", maxWidth: "60ch" }}>
        Деньги пришли на mbank — включите тариф на приглашении. Снимается
        водяной знак на сайте, открытке и видео, открывается печать A5 и
        отправка гостям в один тап.
      </p>

      <ActivateForm token={token ?? ""} tiers={tiers} invites={invites} />

      <h2 style={{ margin: "2.5rem 0 1rem" }}>Последние приглашения</h2>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Ссылка</th>
              <th>Кого чествуют</th>
              <th>Дата тоя</th>
              <th>Создано</th>
              <th>Тариф</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--gray-500)" }}>
                  Приглашений пока нет.
                </td>
              </tr>
            )}
            {invites.map((inv) => (
              <tr key={inv.slug}>
                <td>
                  <a href={`/i/${inv.slug}`}>/i/{inv.slug}</a>
                </td>
                <td>
                  {inv.honoree}
                  {inv.partner ? ` и ${inv.partner}` : ""}
                </td>
                <td>{inv.event_date}</td>
                <td>{formatKgTimestamp(inv.created_at)}</td>
                <td>{inv.premium_tier ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
