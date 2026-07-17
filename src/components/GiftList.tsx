"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { getGuestRef } from "@/lib/guest-ref";
import type { GuestGift, Locale } from "@/lib/types";

/**
 * Guest view of the gift wishlist: reserve an item so presents don't repeat,
 * release your own reservation. `yours` arrives false from the server render
 * (it can't know the browser); we recover it from localStorage on mount and
 * from claim responses afterwards.
 */
export default function GiftList({
  slug,
  locale,
  initial,
  demo = false,
}: {
  slug: string;
  locale: Locale;
  initial: GuestGift[];
  demo?: boolean;
}) {
  const tr = translator(locale);
  const [items, setItems] = useState<GuestGift[]>(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const mine = readMine(slug);
    if (mine.size > 0) {
      setItems((prev) => prev.map((g) => (mine.has(g.id) ? { ...g, yours: true } : g)));
    }
  }, [slug]);

  if (items.length === 0) return null;

  async function act(op: "claim" | "unclaim", id: number) {
    if (demo) {
      setItems((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, taken: op === "claim", yours: op === "claim" } : g,
        ),
      );
      return;
    }
    const ref = getGuestRef();
    if (!ref) {
      setNote(tr("invite.gifts_error"));
      return;
    }
    setBusy(id);
    setNote(null);
    try {
      const res = await fetch(`/api/gifts/${slug}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, id, guest_ref: ref }),
      });
      const data = (await res.json().catch(() => null)) as
        | { status?: string; gifts?: GuestGift[] }
        | null;
      if (data?.gifts) {
        setItems(data.gifts);
        writeMine(slug, data.gifts.filter((g) => g.yours).map((g) => g.id));
      }
      if (res.status === 409) setNote(tr("invite.gifts_taken_note"));
      else if (!res.ok) setNote(tr("invite.gifts_error"));
    } catch {
      setNote(tr("invite.gifts_error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="gifts">
      <span className="invite__event" style={{ display: "block", textAlign: "center" }}>
        {tr("invite.gifts_kicker")}
      </span>
      <h2>{tr("invite.gifts_title")}</h2>
      <p className="gifts__hint">{tr("invite.gifts_hint")}</p>
      <ul className="gifts__list">
        {items.map((g) => (
          <li key={g.id} className={g.taken && !g.yours ? "gifts__item gifts__item--taken" : "gifts__item"}>
            <span className="gifts__title">{g.title}</span>
            {g.yours ? (
              <button
                type="button"
                className="btn-ac"
                disabled={busy === g.id}
                onClick={() => act("unclaim", g.id)}
              >
                ✓ {tr("invite.gifts_yours")}
              </button>
            ) : g.taken ? (
              <span className="gifts__taken">{tr("invite.gifts_taken")}</span>
            ) : (
              <button
                type="button"
                className="btn-ac btn-ac--solid"
                disabled={busy === g.id}
                onClick={() => act("claim", g.id)}
              >
                {tr("invite.gifts_claim")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {note && (
        <p className="gifts__note" role="status">
          {note}
        </p>
      )}
    </div>
  );
}

function mineKey(slug: string): string {
  return `toi.gifts.${slug}`;
}

function readMine(slug: string): Set<number> {
  try {
    const raw = window.localStorage.getItem(mineKey(slug));
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is number => typeof x === "number") : []);
  } catch {
    return new Set();
  }
}

function writeMine(slug: string, ids: number[]): void {
  try {
    window.localStorage.setItem(mineKey(slug), JSON.stringify(ids));
  } catch {
    /* storage unavailable — reservations still work, just not remembered */
  }
}
