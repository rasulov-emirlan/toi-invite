import Link from "next/link";
import { getInvite, listRsvps } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { translator } from "@/lib/i18n";
import { computeRsvpStats } from "@/lib/stats";
import { displayNames, eventLabel } from "@/lib/invite-view";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function RsvpsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;

  const invite = isValidSlug(slug) ? getInvite(slug) : null;
  const locale: Locale = invite?.locale ?? "ru";
  const tr = translator(locale);

  // Token gate — constant-ish comparison; wrong or missing token reveals nothing.
  const authorized =
    invite != null && typeof token === "string" && token === invite.organizer_token;

  if (!invite || !authorized) {
    return (
      <main className="wrap wrap--narrow" style={{ paddingTop: "6rem", textAlign: "center" }}>
        <span className="kicker kicker--red">403</span>
        <h1 style={{ margin: "1rem 0" }}>{tr("rsvps.forbidden")}</h1>
        <p style={{ marginTop: "2rem" }}>
          <Link href="/" className="btn">
            Той·Invite →
          </Link>
        </p>
      </main>
    );
  }

  const rows = listRsvps(slug);
  const stats = computeRsvpStats(rows);

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <Link href="/" className="brand">
            Той<b>·</b>Invite
          </Link>
          <Link href={`/i/${slug}`} className="kicker" style={{ textDecoration: "none" }}>
            {tr("rsvps.back_to_invite")}
          </Link>
        </div>
      </header>

      <main className="wrap">
        <div className="page-head">
          <span className="kicker kicker--red">{tr("rsvps.kicker")}</span>
          <h1>{tr("rsvps.title")}</h1>
          <p style={{ color: "var(--gray-500)", margin: 0 }}>
            {eventLabel(invite, locale)} · {displayNames(invite, locale)}
          </p>
        </div>

        <div className="statgrid">
          <div className="stat">
            <div className="stat__num">{stats.responses}</div>
            <div className="stat__label">{tr("rsvps.total_responses")}</div>
          </div>
          <div className="stat">
            <div className="stat__num" style={{ color: "#1f7a54" }}>
              {stats.coming}
            </div>
            <div className="stat__label">{tr("rsvps.coming")}</div>
          </div>
          <div className="stat">
            <div className="stat__num">{stats.notComing}</div>
            <div className="stat__label">{tr("rsvps.not_coming")}</div>
          </div>
          <div className="stat">
            <div className="stat__num stat__num--red">{stats.totalGuests}</div>
            <div className="stat__label">{tr("rsvps.total_guests")}</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <p style={{ color: "var(--gray-500)" }}>{tr("rsvps.empty")}</p>
        ) : (
          <div className="table-scroll">
            <table className="rsvps">
              <thead>
                <tr>
                  <th>{tr("rsvps.col_name")}</th>
                  <th>{tr("rsvps.col_status")}</th>
                  <th>{tr("rsvps.col_guests")}</th>
                  <th>{tr("rsvps.col_when")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.guest_name}</td>
                    <td>
                      <span className={`pill pill--${row.attendance}`}>
                        {row.attendance === "yes"
                          ? tr("rsvps.status_yes")
                          : tr("rsvps.status_no")}
                      </span>
                    </td>
                    <td>{row.attendance === "yes" ? row.guests_count : "—"}</td>
                    <td>{row.created_at.slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <footer className="footer">
        <div className="wrap">{tr("landing.footer")}</div>
      </footer>
    </>
  );
}
