"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { personalLink, sanitizeGuestName } from "@/lib/personalize";
import type { Locale } from "@/lib/types";

export default function PersonalLinkGenerator({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const tr = translator(locale);
  const [origin, setOrigin] = useState("");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const clean = sanitizeGuestName(name);
  const link = origin ? personalLink(origin, slug, clean) : "";
  const ready = clean.length > 0 && origin.length > 0;

  return (
    <section style={{ marginTop: "2.5rem", borderTop: "1px solid var(--gray-300)", paddingTop: "2rem" }}>
      <span className="kicker kicker--red">{tr("rsvps.personal_kicker")}</span>
      <h2 style={{ fontSize: "1.4rem", margin: "0.5rem 0 0.5rem" }}>
        {tr("rsvps.personal_title")}
      </h2>
      <p className="hint" style={{ maxWidth: "48ch" }}>
        {tr("rsvps.personal_hint")}
      </p>

      <div className="field" style={{ maxWidth: "24rem", marginTop: "1rem" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={tr("rsvps.personal_name_ph")}
          aria-label={tr("rsvps.personal_name_ph")}
        />
      </div>

      {ready && (
        <div className="linkbox" style={{ maxWidth: "36rem", marginTop: "0.75rem" }}>
          <div className="linkrow">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button
              type="button"
              className="copybtn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* clipboard blocked — the field is selectable as a fallback */
                }
              }}
            >
              {copied ? tr("create.copied") : tr("create.copy")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
