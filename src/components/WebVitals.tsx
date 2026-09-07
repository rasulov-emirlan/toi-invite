"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { isVitalMetric, surfaceForPath } from "@/lib/vitals";

/**
 * Reports LCP / INP / CLS to our own endpoint. Mounted once in the root
 * layout: `useReportWebVitals` registers the browser's performance observers
 * and hands back each metric when it settles (LCP at first interaction or
 * hide, CLS and INP at page hide), so nothing here runs on the critical path.
 *
 * The beacon is fire-and-forget and unsampled — traffic is in the hundreds a
 * day, and a p75 computed from a handful of samples is worse than no number
 * at all. Add sampling here if that stops being true.
 */
export default function WebVitals() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    if (!isVitalMetric(metric.name)) return;
    const payload = JSON.stringify({
      metric: metric.name,
      value: metric.value,
      surface: surfaceForPath(pathname),
    });
    try {
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        // CLS and INP arrive at page hide, when a fetch would be cancelled.
        navigator.sendBeacon("/api/vitals", new Blob([payload], { type: "application/json" }));
        return;
      }
      void fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // measurement must never affect the page it measures
    }
  });

  return null;
}
