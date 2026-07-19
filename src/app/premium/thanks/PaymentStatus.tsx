"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { translator } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

type Status = "pending" | "succeeded" | "failed";

/** Polls the payment status while pending — the webhook usually settles it
 *  within seconds of the redirect. */
export default function PaymentStatus({
  pid,
  initialStatus,
  locale,
}: {
  pid: string;
  initialStatus: Status;
  locale: Locale;
}) {
  const tr = useMemo(() => translator(locale), [locale]);
  const [status, setStatus] = useState<Status>(initialStatus);

  useEffect(() => {
    if (status !== "pending") return;
    let stopped = false;
    let tries = 0;
    const tick = async () => {
      if (stopped || tries++ > 40) return; // ~2 min, then leave the pending copy
      try {
        const res = await fetch(`/api/pay/${pid}`);
        if (res.ok) {
          const data = (await res.json()) as { status: Status };
          if (data.status !== "pending") {
            setStatus(data.status);
            return;
          }
        }
      } catch {
        /* transient — keep polling */
      }
      if (!stopped) setTimeout(tick, 3000);
    };
    const id = setTimeout(tick, 3000);
    return () => {
      stopped = true;
      clearTimeout(id);
    };
  }, [pid, status]);

  const title =
    status === "succeeded"
      ? tr("premium.pay_success_title")
      : status === "failed"
        ? tr("premium.pay_failed_title")
        : tr("premium.pay_wait_title");
  const body =
    status === "succeeded"
      ? tr("premium.pay_success_body")
      : status === "failed"
        ? tr("premium.pay_failed_body")
        : tr("premium.pay_wait_body");

  return (
    <div className="success" style={{ marginTop: "2rem" }}>
      <div>
        <span className="kicker kicker--red">
          {status === "succeeded" ? "✓" : status === "failed" ? "✕" : "…"}
        </span>
        <h2 style={{ fontSize: "1.5rem", marginTop: "0.5rem" }} role="status">
          {title}
        </h2>
      </div>
      <p style={{ margin: 0, color: "var(--gray-800)" }}>{body}</p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {status === "failed" && (
          <Link className="btn" href={`/premium?lang=${locale}`}>
            {tr("premium.pay_retry")}
          </Link>
        )}
        <Link className="btn btn--ghost" href={`/?lang=${locale}`}>
          {tr("premium.back")}
        </Link>
      </div>
    </div>
  );
}
