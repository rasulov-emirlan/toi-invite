"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { countdownUnitLabel } from "@/lib/plural";
import type { Locale } from "@/lib/types";

/** How long after the start we keep showing "Той идёт!" before hiding. */
const RUNNING_WINDOW_MS = 12 * 60 * 60 * 1000;

/** Target is the event start as epoch milliseconds (UTC-correct, computed server-side). */
export default function Countdown({
  targetMs,
  locale,
}: {
  targetMs: number;
  locale: Locale;
}) {
  const tr = translator(locale);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Pre-mount: render the shell with blank digits (same height as the real
  // thing) instead of nothing — no mid-page layout jump when JS arrives late
  // on a slow device. Hydration stays deterministic because no time is read.
  if (now === null) {
    return (
      <div className="countdown" aria-hidden="true">
        {(["day", "hour", "minute"] as const).map((u) => (
          <div className="countdown__unit" key={u}>
            <div className="countdown__num">&nbsp;</div>
            <div className="countdown__label">&nbsp;</div>
          </div>
        ))}
      </div>
    );
  }

  const diff = targetMs - now;
  // Long past: an old invite shouldn't celebrate forever.
  if (diff <= -RUNNING_WINDOW_MS) return null;
  if (diff <= 0) {
    return (
      <div className="countdown">
        <div className="countdown__unit">
          <div className="countdown__num">🎉</div>
          <div className="countdown__label">{tr("invite.cd_started")}</div>
        </div>
      </div>
    );
  }

  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;

  const units: Array<[number, string]> = [
    [days, countdownUnitLabel(locale, "day", days)],
    [hours, countdownUnitLabel(locale, "hour", hours)],
    [minutes, countdownUnitLabel(locale, "minute", minutes)],
  ];

  return (
    <div className="countdown">
      {units.map(([n, label]) => (
        <div className="countdown__unit" key={label}>
          <div className="countdown__num">{n}</div>
          <div className="countdown__label">{label}</div>
        </div>
      ))}
    </div>
  );
}
