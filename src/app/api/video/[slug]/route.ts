import { readFile } from "node:fs/promises";
import { getInvite, logEvent } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { isLocale } from "@/lib/i18n";
import { clientKey, videoLimiter } from "@/lib/ratelimit";
import { ensureVideo, videoPathFor } from "@/lib/video-render";
import { videoDownloadName } from "@/lib/video-plan";
import type { Locale } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Video invite. `?status=1` reports (and lazily starts) the render — the
 * client polls it; a bare GET serves the finished MP4. Renders are
 * content-addressed on disk, so repeat downloads and unchanged invites never
 * re-encode.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = videoLimiter.check(clientKey(req, "video"), Date.now());
  if (!rl.allowed) {
    return new Response("rate limited", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  const { slug } = await params;
  if (!isValidSlug(slug)) return new Response("not found", { status: 404 });
  const invite = getInvite(slug);
  if (!invite) return new Response("not found", { status: 404 });

  const url = new URL(req.url);
  const langParam = url.searchParams.get("lang");
  const locale: Locale = isLocale(langParam) ? langParam : invite.locale;

  if (url.searchParams.get("status")) {
    const status = await ensureVideo(invite, locale);
    if (status === "rendering" && !videoStarted.has(slug)) {
      videoStarted.add(slug);
      logEvent("video_render", slug);
    }
    return Response.json({ status });
  }

  try {
    const buf = await readFile(videoPathFor(invite, locale));
    logEvent("video_download", slug);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${videoDownloadName(slug)}"`,
        // Content-addressed on disk but URL-stable — an edited invite must
        // not replay from the browser cache.
        "Cache-Control": "no-store",
      },
    });
  } catch {
    const status = await ensureVideo(invite, locale);
    return Response.json({ status }, { status: status === "error" ? 500 : 202 });
  }
}

/** First-poll marker so `video_render` is logged once per invite per process. */
const videoStarted = new Set<string>();
