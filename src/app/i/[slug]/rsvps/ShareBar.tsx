"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { telegramShareUrl, whatsappShareUrl } from "@/lib/share";
import type { Locale } from "@/lib/types";

/**
 * The organizer actions that used to hide at the bottom of the invite page:
 * share the guest link, copy it, open the invite, edit it.
 */
export default function ShareBar({
  slug,
  token,
  locale,
}: {
  slug: string;
  token: string;
  locale: Locale;
}) {
  const tr = translator(locale);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  // Clipboard quietly no-ops in some WhatsApp/TG WebViews — when it fails,
  // surface the URL as selectable text instead of pretending it worked.
  const [copyFailed, setCopyFailed] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const publicUrl = `${origin}/i/${slug}`;

  return (
    <>
      <div className="sharebar">
        <a
          className="btn"
          href={whatsappShareUrl(tr("create.share_text"), publicUrl)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr("create.share_whatsapp")}
        </a>
        <a
          className="btn btn--ghost"
          href={telegramShareUrl(tr("create.share_text"), publicUrl)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr("create.share_telegram")}
        </a>
        <button
          type="button"
          className="btn btn--ghost"
          aria-live="polite"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(publicUrl);
              setCopied(true);
              setCopyFailed(false);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopyFailed(true);
            }
          }}
        >
          {copied ? tr("create.copied") : tr("rsvps.copy_guest_link")}
        </button>
        <a className="btn btn--ghost" href={`/i/${slug}`}>
          {tr("create.view_invite")}
        </a>
        <a
          className="btn btn--ghost"
          href={`/i/${slug}/edit?token=${encodeURIComponent(token)}`}
        >
          {tr("rsvps.edit_invite")}
        </a>
      </div>
      {copyFailed && (
        <div className="linkrow" style={{ margin: "-1rem 0 2rem", maxWidth: "32rem" }}>
          <input readOnly value={publicUrl} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </>
  );
}
