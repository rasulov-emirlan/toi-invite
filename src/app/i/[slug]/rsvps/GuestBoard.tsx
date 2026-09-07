"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { whatsappDirectUrl, whatsappShareUrl } from "@/lib/share";
import { formatKgPhone, whatsappDigits } from "@/lib/phone";
import type { GuestBoardRow } from "@/lib/db";
import type { Locale } from "@/lib/types";

/** Which slice of a 150-name list the organizer is looking at. At that size
 *  "who still hasn't answered" is the only view that matters most evenings. */
type Filter = "all" | "pending" | "coming";

/**
 * The organizer's guest board: whom they invited, who opened their personal
 * link, who answered. Each guest gets a personal link (?to=name&g=id) — the
 * ?g ties opens and RSVPs back to this list.
 *
 * Sending is where the tiers split. Free gets WhatsApp's share sheet, which
 * means picking the contact by hand for every guest. Paid gets `wa.me/<number>`
 * — the chat opens on the right person with the message already written, which
 * is the difference between an evening and five minutes at 150 guests.
 */
export default function GuestBoard({
  slug,
  token,
  locale,
  initial,
  canDirectSend,
}: {
  slug: string;
  token: string;
  locale: Locale;
  initial: GuestBoardRow[];
  /** `directSend` entitlement — one-tap `wa.me/<number>` instead of the
   *  contact picker. */
  canDirectSend: boolean;
}) {
  const tr = translator(locale);
  const [rows, setRows] = useState<GuestBoardRow[]>(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  // Clipboard silently no-ops in some WhatsApp/TG WebViews — fall back to a
  // selectable input under that guest's card instead of failing quietly.
  const [copyFallbackId, setCopyFallbackId] = useState<number | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const [filter, setFilter] = useState<Filter>("all");
  const [phoneEditId, setPhoneEditId] = useState<number | null>(null);
  const [phoneDraft, setPhoneDraft] = useState("");

  /** One name per line — organizers paste whole family lists from Notes.
   *  Sent as one bulk request (one rate-limit token, one transaction), capped
   *  at the API's 100-per-request limit. Whatever wasn't added — over-cap
   *  overflow, capacity-dropped tail, or a full list — stays in the box. */
  async function addNames(raw: string): Promise<void> {
    const names = raw
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    const batch = names.slice(0, 100);
    const r = await op({ op: "add", names: batch });
    if (r.status === 409) {
      setError(tr("rsvps.board_full").replace("{n}", String(names.length)));
      return;
    }
    if (r.status !== 201) return; // error already surfaced; input untouched
    const added = r.added ?? batch.length;
    if (added < names.length) {
      setName(names.slice(added).join("\n"));
      setError(tr("rsvps.board_full").replace("{n}", String(names.length - added)));
    } else {
      setName("");
    }
  }

  function personalUrl(g: GuestBoardRow): string {
    return `${origin}/i/${slug}?to=${encodeURIComponent(g.name)}&g=${g.token}`;
  }

  async function op(
    body: Record<string, unknown>,
  ): Promise<{ status: number; guests?: GuestBoardRow[]; added?: number }> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/guests/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...body }),
      });
      let data: { guests?: GuestBoardRow[]; added?: number } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        /* non-JSON error body */
      }
      if (res.ok && data.guests) setRows(data.guests);
      // 409 gets its specific message from the caller.
      if (!res.ok && res.status !== 409) setError(tr("rsvps.board_error"));
      return { status: res.status, ...data };
    } catch {
      setError(tr("rsvps.board_error"));
      return { status: 0 };
    } finally {
      setBusy(false);
    }
  }

  async function savePhone(id: number): Promise<void> {
    const r = await op({ op: "phone", id, phone: phoneDraft });
    if (r.status === 400) {
      setError(tr("rsvps.board_phone_bad"));
      return;
    }
    if (r.status === 200) {
      setPhoneEditId(null);
      setPhoneDraft("");
    }
  }

  function status(g: GuestBoardRow): { key: string; label: string } {
    if (g.attendance === "yes") return { key: "coming", label: tr("rsvps.st_coming") };
    if (g.attendance === "no") return { key: "declined", label: tr("rsvps.st_declined") };
    if (g.opened_at) return { key: "opened", label: tr("rsvps.st_opened") };
    return { key: "invited", label: tr("rsvps.st_not_opened") };
  }

  function matches(g: GuestBoardRow, f: Filter): boolean {
    if (f === "pending") return g.attendance === null;
    if (f === "coming") return g.attendance === "yes";
    return true;
  }

  const visible = rows.filter((g) => matches(g, filter));

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
          await addNames(name);
        }}
      >
        <textarea
          value={name}
          rows={1}
          maxLength={4000}
          aria-label={tr("rsvps.personal_name_ph")}
          placeholder={tr("rsvps.personal_name_ph")}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn" disabled={busy || !name.trim()}>
          {tr("rsvps.board_add")}
        </button>
      </form>
      <p className="hint" style={{ margin: "-0.5rem 0 1rem" }}>
        {tr("rsvps.board_add_hint")}
      </p>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <div className="chiprow" role="group">
          {(["all", "pending", "coming"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {tr(`rsvps.board_filter_${f}`)} · {rows.filter((g) => matches(g, f)).length}
            </button>
          ))}
        </div>
      )}

      {!canDirectSend && rows.some((g) => g.phone) && (
        <p className="board-upsell">
          {tr("rsvps.board_upsell")}{" "}
          <a href={`/premium?lang=${locale}&slug=${slug}`}>
            {tr("rsvps.board_write_locked")} →
          </a>
        </p>
      )}

      {rows.length === 0 ? (
        <p style={{ color: "var(--gray-500)" }}>{tr("rsvps.board_empty")}</p>
      ) : visible.length === 0 ? (
        <p style={{ color: "var(--gray-500)" }}>{tr("rsvps.board_none_in_filter")}</p>
      ) : (
        <ul className="guestlist">
          {visible.map((g) => {
            const st = status(g);
            const url = personalUrl(g);
            const answered = g.attendance !== null;
            const message = answered ? tr("create.share_text") : tr("rsvps.remind_text");
            // A number alone isn't enough — the one-tap send is the paid part.
            const direct = canDirectSend && !!g.phone;
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
                {phoneEditId === g.id ? (
                  <div className="guestcard__phone">
                    <input
                      type="tel"
                      inputMode="tel"
                      autoFocus
                      value={phoneDraft}
                      placeholder={tr("rsvps.board_phone_ph")}
                      aria-label={tr("rsvps.board_phone_add")}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void savePhone(g.id);
                        if (e.key === "Escape") setPhoneEditId(null);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost"
                      disabled={busy}
                      onClick={() => void savePhone(g.id)}
                    >
                      {tr("rsvps.board_phone_save")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="guestcard__phonebtn"
                    onClick={() => {
                      setPhoneEditId(g.id);
                      setPhoneDraft(g.phone ?? "");
                      setError(null);
                    }}
                  >
                    {g.phone ? formatKgPhone(g.phone) : `+ ${tr("rsvps.board_phone_add")}`}
                  </button>
                )}
                <div className="guestcard__actions">
                  <a
                    className={`btn ${direct ? "" : "btn--ghost"}`}
                    href={
                      direct
                        ? whatsappDirectUrl(whatsappDigits(g.phone!), message, url)
                        : whatsappShareUrl(message, url)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {direct
                      ? `${tr("rsvps.board_write")} · ${g.name.split(" ")[0]}`
                      : answered
                        ? "WhatsApp"
                        : `${tr("rsvps.board_remind")} · WhatsApp`}
                  </a>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(url);
                        setCopiedId(g.id);
                        setCopyFallbackId(null);
                        setTimeout(() => setCopiedId(null), 1500);
                      } catch {
                        setCopyFallbackId(g.id);
                      }
                    }}
                  >
                    {copiedId === g.id ? tr("create.copied") : tr("create.copy")}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost guestcard__remove"
                    disabled={busy}
                    onClick={() => {
                      // One 30px tap away from «Копировать» and irreversible —
                      // the personal link and open/answer status die with it.
                      if (window.confirm(tr("rsvps.board_confirm_remove").replace("{name}", g.name))) {
                        void op({ op: "remove", id: g.id });
                      }
                    }}
                  >
                    {tr("gifts.remove")}
                  </button>
                </div>
                {copyFallbackId === g.id && (
                  <div className="linkrow" style={{ marginTop: "0.5rem" }}>
                    <input readOnly value={url} onFocus={(e) => e.target.select()} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
