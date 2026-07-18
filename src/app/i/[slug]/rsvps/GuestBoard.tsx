"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { whatsappShareUrl } from "@/lib/share";
import type { GuestBoardRow } from "@/lib/db";
import type { Locale } from "@/lib/types";

/**
 * The organizer's guest board: whom they invited, who opened their personal
 * link, who answered. Each guest gets a personal link (?to=name&g=id) — the
 * ?g ties opens and RSVPs back to this list — plus a one-tap WhatsApp send,
 * and a reminder for guests who haven't answered yet.
 */
export default function GuestBoard({
  slug,
  token,
  locale,
  initial,
}: {
  slug: string;
  token: string;
  locale: Locale;
  initial: GuestBoardRow[];
}) {
  const tr = translator(locale);
  const [rows, setRows] = useState<GuestBoardRow[]>(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  function personalUrl(g: GuestBoardRow): string {
    return `${origin}/i/${slug}?to=${encodeURIComponent(g.name)}&g=${g.token}`;
  }

  async function op(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/guests/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...body }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { guests: GuestBoardRow[] };
      setRows(data.guests);
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function status(g: GuestBoardRow): { key: string; label: string } {
    if (g.attendance === "yes") return { key: "coming", label: tr("rsvps.st_coming") };
    if (g.attendance === "no") return { key: "declined", label: tr("rsvps.st_declined") };
    if (g.opened_at) return { key: "opened", label: tr("rsvps.st_opened") };
    return { key: "invited", label: tr("rsvps.st_not_opened") };
  }

  return (
    <section className="guestboard">
      <span className="kicker kicker--red">{tr("rsvps.board_kicker")}</span>
      <h2>{tr("rsvps.board_title")}</h2>
      <p className="hint">{tr("rsvps.board_hint")}</p>

      <form
        className="addrow"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || busy) return;
          if (await op({ op: "add", name })) setName("");
        }}
      >
        <input
          value={name}
          maxLength={80}
          placeholder={tr("rsvps.personal_name_ph")}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn" disabled={busy || !name.trim()}>
          {tr("rsvps.board_add")}
        </button>
      </form>

      {error && (
        <div className="alert" role="alert">
          {tr("gifts.error")}
        </div>
      )}

      {rows.length === 0 ? (
        <p style={{ color: "var(--gray-500)" }}>{tr("rsvps.board_empty")}</p>
      ) : (
        <ul className="guestlist">
          {rows.map((g) => {
            const st = status(g);
            const url = personalUrl(g);
            const answered = g.attendance !== null;
            return (
              <li key={g.id} className="guestcard">
                <div className="guestcard__head">
                  <span className="guestcard__name">
                    {g.name}
                    {g.attendance === "yes" && g.guests_count
                      ? ` · ${g.guests_count}`
                      : ""}
                  </span>
                  <span className={`pill pill--g-${st.key}`}>{st.label}</span>
                </div>
                <div className="guestcard__actions">
                  <a
                    className="btn btn--ghost"
                    href={whatsappShareUrl(
                      answered ? tr("create.share_text") : tr("rsvps.remind_text"),
                      url,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {answered ? "WhatsApp" : `${tr("rsvps.board_remind")} · WhatsApp`}
                  </a>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(url);
                        setCopiedId(g.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      } catch {
                        /* clipboard blocked */
                      }
                    }}
                  >
                    {copiedId === g.id ? tr("create.copied") : tr("create.copy")}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost guestcard__remove"
                    disabled={busy}
                    onClick={() => void op({ op: "remove", id: g.id })}
                  >
                    {tr("gifts.remove")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
