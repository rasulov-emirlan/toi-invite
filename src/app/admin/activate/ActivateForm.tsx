"use client";

import { useState } from "react";
import type { RecentInvite } from "@/lib/db";

/**
 * Slug + tier → activated. Deliberately a plain form with a confirmation
 * step: this is the control that decides whether someone who paid actually
 * gets what they paid for, and it is operated one-handed on a phone.
 */
export default function ActivateForm({
  token,
  tiers,
  invites,
}: {
  token: string;
  tiers: Array<{ key: string; label: string }>;
  invites: RecentInvite[];
}) {
  const [slug, setSlug] = useState("");
  const [tier, setTier] = useState(tiers[0]?.key ?? "premium");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const known = invites.find((i) => i.slug === slug.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !slug.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, slug: slug.trim(), tier }),
      });
      if (res.status === 200) {
        setResult({ ok: true, message: `Тариф «${tier}» включён на /i/${slug.trim()}.` });
        setSlug("");
      } else if (res.status === 404) {
        setResult({ ok: false, message: "Такого приглашения нет." });
      } else if (res.status === 403) {
        setResult({ ok: false, message: "Токен не подошёл — откройте страницу заново." });
      } else {
        setResult({ ok: false, message: "Не получилось. Попробуйте ещё раз." });
      }
    } catch {
      setResult({ ok: false, message: "Нет связи с сервером." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} style={{ maxWidth: "32rem" }}>
      <div className="field">
        <label htmlFor="act-slug">Ссылка приглашения (slug)</label>
        <input
          id="act-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="r22e5c6w"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {/* Confirming whose toi this is before charging the tier to it — slugs
            are eight anonymous characters and a typo hits a stranger. */}
        <p className="hint">
          {slug.trim() === ""
            ? " "
            : known
              ? `${known.honoree}${known.partner ? ` и ${known.partner}` : ""} · ${known.event_date}${known.premium_tier ? ` · уже: ${known.premium_tier}` : ""}`
              : "Нет среди последних 40 — проверьте написание."}
        </p>
      </div>

      <div className="field">
        <label htmlFor="act-tier">Тариф</label>
        <select id="act-tier" value={tier} onChange={(e) => setTier(e.target.value)}>
          {tiers.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn" disabled={busy || !slug.trim()}>
        {busy ? "Включаю…" : "Включить тариф"}
      </button>

      {result && (
        <div className={result.ok ? "notice" : "alert"} role="status">
          {result.message}
        </div>
      )}
    </form>
  );
}
