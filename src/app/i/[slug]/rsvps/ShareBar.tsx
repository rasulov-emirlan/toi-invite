"use client";

import { useEffect, useRef, useState } from "react";
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

  // Video renders server-side (~30-60s): poll the status endpoint, then hand
  // the finished MP4 to the browser as a normal download navigation.
  const [videoState, setVideoState] = useState<"idle" | "working" | "error">("idle");
  const unmounted = useRef(false);
  useEffect(() => {
    return () => {
      unmounted.current = true;
    };
  }, []);

  async function downloadVideo() {
    if (videoState === "working") return;
    setVideoState("working");
    try {
      // ~3 minutes of polling covers a render queued behind another invite.
      for (let attempt = 0; attempt < 70; attempt++) {
        const res = await fetch(`/api/video/${slug}?status=1`);
        if (unmounted.current) return;
        const body = res.ok ? ((await res.json()) as { status?: string }) : null;
        if (body?.status === "ready") {
          window.location.href = `/api/video/${slug}`;
          setVideoState("idle");
          return;
        }
        if (body?.status === "error") break;
        await new Promise((r) => setTimeout(r, 2500));
        if (unmounted.current) return;
      }
      setVideoState("error");
    } catch {
      if (!unmounted.current) setVideoState("error");
    }
  }

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
        <a className="btn btn--ghost" href={`/api/card/${slug}?format=story`} download>
          {tr("create.download_story")} ↓
        </a>
        <a className="btn btn--ghost" href={`/api/card/${slug}?format=print`} download>
          {tr("create.download_print")} ↓
        </a>
        <button
          type="button"
          className="btn btn--ghost"
          aria-busy={videoState === "working"}
          disabled={videoState === "working"}
          onClick={() => void downloadVideo()}
        >
          {tr("create.download_video")} ↓
        </button>
        <a
          className="btn btn--ghost"
          href={`/i/${slug}/edit?token=${encodeURIComponent(token)}`}
        >
          {tr("rsvps.edit_invite")}
        </a>
      </div>
      {videoState === "working" && (
        <p className="hint" role="status" style={{ margin: "-1rem 0 2rem" }}>
          {tr("create.video_rendering")}
        </p>
      )}
      {videoState === "error" && (
        <div className="alert" role="alert" style={{ margin: "-1rem 0 2rem" }}>
          {tr("create.video_error")}
        </div>
      )}
      {copyFailed && (
        <div className="linkrow" style={{ margin: "-1rem 0 2rem", maxWidth: "32rem" }}>
          <input readOnly value={publicUrl} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </>
  );
}
