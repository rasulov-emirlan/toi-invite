import { NextResponse } from "next/server";
import { logWebVital } from "@/lib/db";
import { clientIp, trackLimiter } from "@/lib/ratelimit";
import { isVitalMetric, isVitalSurface, VITAL_MAX_VALUE } from "@/lib/vitals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Best-effort like every other beacon: a rejected sample still answers 204
  // so the client never retries or surfaces an error to a guest.
  if (trackLimiter.check(`vitals:${clientIp(req)}`, Date.now()).allowed) {
    try {
      const body = (await req.json()) as {
        metric?: unknown;
        value?: unknown;
        surface?: unknown;
      };
      const value = typeof body?.value === "number" ? body.value : NaN;
      if (
        isVitalMetric(body?.metric) &&
        isVitalSurface(body?.surface) &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= VITAL_MAX_VALUE
      ) {
        logWebVital(body.metric, value, body.surface);
      }
    } catch {
      // malformed beacon — ignore
    }
  }
  return new NextResponse(null, { status: 204 });
}
