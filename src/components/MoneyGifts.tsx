"use client";

import { useState } from "react";
import { translator } from "@/lib/i18n";
import type { Locale, MoneyGiftItem } from "@/lib/types";

/**
 * The money-gift block (реквизиты для поздравлений): cash is the default toi
 * gift, and a transfer needs exactly one thing — the number, copied without
 * typos. One tap copies; the WebView-without-clipboard fallback selects the
 * text so the long-press copy still works.
 */
export default function MoneyGifts({
  items,
  locale,
  interactive = true,
}: {
  items: MoneyGiftItem[];
  locale: Locale;
  /** false in the builder preview — no live clipboard there. */
  interactive?: boolean;
}) {
  const tr = translator(locale);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [failedIdx, setFailedIdx] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="money">
      <span className="invite__event" style={{ display: "block", textAlign: "center" }}>
        {tr("invite.money_kicker")}
      </span>
      <h2>{tr("invite.money_title")}</h2>
      <p className="gifts__hint">{tr("invite.money_hint")}</p>
      <ul className="money__list">
        {items.map((item, i) => (
          <li className="money__item" key={i}>
            <span className="money__label">{item.label}</span>
            {failedIdx === i ? (
              <input
                className="money__value-input"
                readOnly
                value={item.value}
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <span className="money__value">{item.value}</span>
            )}
            <button
              type="button"
              className="btn-ac"
              aria-live="polite"
              disabled={!interactive}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(item.value);
                  setCopiedIdx(i);
                  setFailedIdx(null);
                  setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1500);
                } catch {
                  setFailedIdx(i);
                }
              }}
            >
              {copiedIdx === i ? tr("invite.money_copied") : tr("invite.money_copy")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
