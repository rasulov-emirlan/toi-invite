"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PREMIUM_TIERS, formatSom, getTier } from "@/lib/premium";
import { translator } from "@/lib/i18n";
import type { Locale, PremiumTierKey } from "@/lib/types";

type Selected = Exclude<PremiumTierKey, "free">;

export default function PremiumOrder({
  locale,
  paymentsEnabled = false,
  slug,
}: {
  locale: Locale;
  /** Finik acquiring wired up server-side — paid tiers go to a real checkout. */
  paymentsEnabled?: boolean;
  /** Invite to activate the paid tier on after payment. */
  slug?: string;
}) {
  const tr = useMemo(() => translator(locale), [locale]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="success" style={{ marginTop: "2rem" }}>
        <div>
          <span className="kicker kicker--red">✓</span>
          <h2 style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>
            {tr("premium.success_title")}
          </h2>
        </div>
        <p style={{ margin: 0, color: "var(--gray-800)" }}>
          {tr("premium.success_body")}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setDone(false);
              setSelected(null);
            }}
          >
            {tr("premium.success_again")}
          </button>
          <Link className="btn btn--ghost" href={`/?lang=${locale}`}>
            {tr("premium.back")}
          </Link>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <OrderForm
        locale={locale}
        tier={selected}
        paymentsEnabled={paymentsEnabled}
        slug={slug}
        onCancel={() => setSelected(null)}
        onDone={() => setDone(true)}
      />
    );
  }

  return (
    <>
      <div className="tiers">
        {PREMIUM_TIERS.map((tier) => (
          <div
            key={tier.key}
            className={`tier${tier.popular ? " tier--popular" : ""}`}
          >
            <div className="tier__top">
              <span className="tier__name">{tier.names[locale]}</span>
              {tier.popular && (
                <span className="tier__badge">{tr("premium.popular")}</span>
              )}
              {tier.key === "free" && (
                <span className="tier__badge">{tr("premium.free_badge")}</span>
              )}
            </div>

            <div className="tier__price">
              {tier.priceSom === 0 ? (
                tr("premium.price_free")
              ) : (
                <>
                  {formatSom(tier.priceSom)}
                  <small>{tr("premium.price_suffix")}</small>
                </>
              )}
            </div>

            <p className="tier__tagline">{tier.tagline[locale]}</p>

            <ul className="featurelist">
              {tier.features[locale].map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            {tier.orderable ? (
              <button
                type="button"
                className="btn"
                onClick={() => setSelected(tier.key as Selected)}
              >
                {tr("premium.order")} · {tier.names[locale]}
              </button>
            ) : (
              <Link className="btn btn--ghost" href={`/create?lang=${locale}`}>
                {tr("premium.free_cta")}
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="premium-note">{tr(paymentsEnabled ? "premium.pay_note_live" : "premium.pay_note")}</p>
    </>
  );
}

function OrderForm({
  locale,
  tier,
  paymentsEnabled,
  slug,
  onCancel,
  onDone,
}: {
  locale: Locale;
  tier: Selected;
  paymentsEnabled?: boolean;
  slug?: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const tr = useMemo(() => translator(locale), [locale]);
  const cfg = getTier(tier);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Real checkout when Finik is wired up AND this tier's promises are
      // deliverable today; the payment route records the lead too, so nothing
      // is lost if the payer abandons the checkout.
      if (paymentsEnabled && cfg.payable) {
        const res = await fetch("/api/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier, name, phone, locale, comment, slug }),
        });
        if (res.status === 429) {
          const retry = Number(res.headers.get("Retry-After") ?? "30");
          setError(tr("premium.form_rate_limited").replace("{n}", String(retry)));
          setSubmitting(false);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { url: string };
          window.location.assign(data.url);
          return; // keep the button disabled while the browser navigates
        }
        if (res.status === 502) {
          // Provider hiccup — the lead was already recorded server-side, so
          // degrade to the "мы свяжемся" flow instead of a dead end.
          onDone();
          return;
        }
        if (res.status !== 503) {
          setError(tr("premium.form_error"));
          setSubmitting(false);
          return;
        }
        // 503 → payments not configured: fall through to the interest form
        // so the lead is still captured.
      }
      const res = await fetch("/api/premium-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, name, phone, locale, comment }),
      });
      if (res.status === 429) {
        const retry = Number(res.headers.get("Retry-After") ?? "30");
        setError(tr("premium.form_rate_limited").replace("{n}", String(retry)));
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError(tr("premium.form_error"));
        setSubmitting(false);
        return;
      }
      onDone();
    } catch {
      setError(tr("premium.form_error"));
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="tier-tag">
        {tr("premium.selected_label")}:{" "}
        <b>
          {cfg.names[locale]} · {formatSom(cfg.priceSom)}{" "}
          {tr("premium.price_suffix")}
        </b>
      </div>

      <div className="field">
        <label htmlFor="pi-name">{tr("premium.form_name")}</label>
        <input
          id="pi-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          placeholder="Азамат"
        />
      </div>

      <div className="field">
        <label htmlFor="pi-phone">{tr("premium.form_phone")}</label>
        <input
          id="pi-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={24}
          required
          placeholder="+996 555 12 34 56"
        />
        <p className="hint">{tr("premium.form_phone_hint")}</p>
      </div>

      <div className="field">
        <label htmlFor="pi-comment">{tr("premium.form_comment")}</label>
        <textarea
          id="pi-comment"
          value={comment}
          maxLength={400}
          onChange={(e) => setComment(e.target.value)}
          placeholder={tr("premium.form_comment_ph")}
        />
      </div>

      {error && <div className="alert">{error}</div>}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting
            ? tr("premium.form_submitting")
            : paymentsEnabled && cfg.payable
              ? tr("premium.pay_submit")
              : tr("premium.form_submit")}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          {tr("premium.form_cancel")}
        </button>
      </div>
    </form>
  );
}
