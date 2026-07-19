import Link from "next/link";
import { listGifts, listGuestBoard, listRsvps } from "@/lib/db";
import { requireOrganizer } from "@/lib/organizer";
import Forbidden from "@/components/Forbidden";
import { translator } from "@/lib/i18n";
import { computeRsvpStats } from "@/lib/stats";
import { displayNames, eventLabel } from "@/lib/invite-view";
import { formatKgTimestamp } from "@/lib/calendar";
import type { Locale } from "@/lib/types";
import ShareBar from "./ShareBar";
import GiftManager from "./GiftManager";
import GuestBoard from "./GuestBoard";

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

  const invite = requireOrganizer(slug, token);
  const locale: Locale = invite?.locale ?? "ru";
  const tr = translator(locale);

  if (!invite) return <Forbidden message={tr("rsvps.forbidden")} withHomeLink />;

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

        <ShareBar slug={slug} token={token as string} locale={locale} />

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

        {rows.length > 0 && (
          <p style={{ margin: "0 0 1rem" }}>
            <a
              className="btn btn--ghost"
              href={`/api/export/${slug}?token=${encodeURIComponent(token as string)}`}
            >
              {tr("rsvps.download_csv")} ↓
            </a>
          </p>
        )}

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
                    <td data-label={tr("rsvps.col_name")}>
                      {row.guest_name}
                      {row.wish && <span className="rsvp-wish">«{row.wish}»</span>}
                    </td>
                    <td data-label={tr("rsvps.col_status")}>
                      <span className={`pill pill--${row.attendance}`}>
                        {row.attendance === "yes"
                          ? tr("rsvps.status_yes")
                          : tr("rsvps.status_no")}
                      </span>
                    </td>
                    <td data-label={tr("rsvps.col_guests")}>{row.attendance === "yes" ? row.guests_count : "—"}</td>
                    <td data-label={tr("rsvps.col_when")}>{formatKgTimestamp(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <GiftManager
          slug={slug}
          token={token as string}
          locale={locale}
          initial={listGifts(slug)}
        />

        <GuestBoard
          slug={slug}
          token={token as string}
          locale={locale}
          initial={listGuestBoard(slug)}
        />
      </main>
      <footer className="footer">
        <div className="wrap">{tr("landing.footer")}</div>
      </footer>
    </>
  );
}
