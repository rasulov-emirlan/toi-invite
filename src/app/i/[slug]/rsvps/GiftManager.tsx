"use client";

import { useState } from "react";
import { translator } from "@/lib/i18n";
import { GIFT_LIMITS } from "@/lib/gifts";
import type { GiftRecord, Locale } from "@/lib/types";

/** Organizer's wishlist editor: add items, remove them, free a reservation. */
export default function GiftManager({
  slug,
  token,
  locale,
  initial,
}: {
  slug: string;
  token: string;
  locale: Locale;
  initial: GiftRecord[];
}) {
  const tr = translator(locale);
  const [gifts, setGifts] = useState<GiftRecord[]>(initial);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function op(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/gifts/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...body }),
      });
      const data = (await res.json().catch(() => null)) as { gifts?: GiftRecord[] } | null;
      if (!res.ok) {
        setError(tr("gifts.error"));
        return false;
      }
      if (data?.gifts) setGifts(data.gifts);
      return true;
    } catch {
      setError(tr("gifts.error"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (await op({ op: "add", title: t })) setTitle("");
  }

  return (
    <section style={{ marginTop: "2.5rem", borderTop: "1px solid var(--gray-300)", paddingTop: "2rem" }}>
      <span className="kicker kicker--red">{tr("gifts.kicker")}</span>
      <h2 style={{ fontSize: "1.4rem", margin: "0.5rem 0 0.5rem" }}>{tr("gifts.title")}</h2>
      <p className="hint" style={{ maxWidth: "48ch" }}>
        {tr("gifts.hint")}
      </p>

      <form onSubmit={add} className="giftadd">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={GIFT_LIMITS.title}
          placeholder={tr("gifts.add_ph")}
          aria-label={tr("gifts.add_ph")}
        />
        <button type="submit" className="btn" disabled={busy || title.trim().length === 0}>
          {tr("gifts.add")}
        </button>
      </form>

      {error && (
        <div className="alert" role="alert" style={{ marginTop: "0.75rem", maxWidth: "36rem" }}>
          {error}
        </div>
      )}

      {gifts.length > 0 && (
        <ul className="giftrows">
          {gifts.map((g) => (
            <li key={g.id}>
              <span className="giftrows__title">
                {g.title}
                {g.claimed_ref && (
                  <span className="giftrows__claimed">
                    {tr("gifts.claimed_by")} {g.claimed_name ?? tr("gifts.claimed_anon")}
                  </span>
                )}
              </span>
              <span className="giftrows__actions">
                {g.claimed_ref && (
                  <button type="button" disabled={busy} onClick={() => op({ op: "release", id: g.id })}>
                    {tr("gifts.release")}
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => op({ op: "remove", id: g.id })}>
                  {tr("gifts.remove")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
