import type { Metadata } from "next";
import Link from "next/link";
import { listPremiumInterest } from "@/lib/db";
import { isAdminToken } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PremiumLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!isAdminToken(token)) {
    return (
      <main className="wrap wrap--narrow" style={{ paddingTop: "6rem", textAlign: "center" }}>
        <span className="kicker kicker--red">403</span>
        <h1 style={{ margin: "1rem 0" }}>Доступ закрыт</h1>
      </main>
    );
  }

  const rows = listPremiumInterest();
  const csvHref = `/api/premium-leads?token=${encodeURIComponent(token as string)}`;

  return (
    <main className="wrap">
      <div className="page-head">
        <span className="kicker kicker--red">Премиум</span>
        <h1>Заявки на премиум</h1>
      </div>

      <div className="statgrid">
        <div className="stat">
          <div className="stat__num">{rows.length}</div>
          <div className="stat__label">Заявок</div>
        </div>
      </div>

      <p style={{ margin: "0 0 1rem" }}>
        <a className="btn btn--ghost" href={csvHref}>Скачать CSV ↓</a>
      </p>

      {rows.length === 0 ? (
        <p style={{ color: "var(--gray-500)" }}>Заявок пока нет.</p>
      ) : (
        <div className="table-scroll">
          <table className="rsvps">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тариф</th>
                <th>Имя</th>
                <th>WhatsApp</th>
                <th>Язык</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const digits = row.phone.replace(/\D/g, "");
                return (
                  <tr key={row.id}>
                    <td>{row.created_at}</td>
                    <td>{row.tier}</td>
                    <td>{row.name}</td>
                    <td>
                      <a href={`https://wa.me/${digits}`}>{row.phone}</a>
                    </td>
                    <td>{row.locale}</td>
                    <td>{row.comment ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/premium" className="kicker">← К премиуму</Link>
      </p>
    </main>
  );
}
