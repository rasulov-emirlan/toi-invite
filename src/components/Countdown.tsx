"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

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

  // Avoid hydration mismatch: render nothing until mounted on the client.
  if (now === null) return null;

  const diff = targetMs - now;
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
    [days, tr("invite.cd_days")],
    [hours, tr("invite.cd_hours")],
    [minutes, tr("invite.cd_minutes")],
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
