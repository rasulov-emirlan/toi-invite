import sharp from "sharp";
import QRCode from "qrcode";
import { ImageResponse } from "next/og";
import { getInvite, logEvent } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { isLocale, translator } from "@/lib/i18n";
import { getTemplate } from "@/lib/templates";
import { displayNames, eventLabel, formatEventDate } from "@/lib/invite-view";
import { CARD_DIMENSIONS, cardFilename, cardScale, isCardFormat } from "@/lib/card";
import { BASE_URL } from "@/lib/base-url";
import { cardLimiter, clientKey } from "@/lib/ratelimit";
import {
  JpegCache,
  heroDataUri,
  loadFonts,
  releaseRenderSlot,
  tryAcquireRenderSlot,
} from "@/lib/render-shared";
import type { Locale } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Print buffers run ~0.5MB — keep the cache small (the OG route's 300 would
// be ~150MB of JPEGs here).
const jpegCache = new JpegCache(40);
const inflight = new Map<string, Promise<Buffer>>();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = cardLimiter.check(clientKey(req, "card"), Date.now());
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
  const formatParam = url.searchParams.get("format") ?? "story";
  if (!isCardFormat(formatParam)) return new Response("bad format", { status: 400 });
  const langParam = url.searchParams.get("lang");
  const locale: Locale = isLocale(langParam) ? langParam : invite.locale;

  const tpl = getTemplate(invite.template);
  const names = displayNames(invite, locale);
  const label = eventLabel(invite, locale);
  const when = `${formatEventDate(invite.event_date, locale)} · ${invite.event_time}`;
  const venueName = invite.venue_name;
  const landmark = invite.landmark;
  // Paid tiers bought «Без надписи Той-Invite» — the download honors it too.
  const watermark = !invite.premium_tier;

  const cacheKey = [
    slug, formatParam, locale, invite.template, label, names, when,
    venueName, landmark ?? "", watermark ? "wm" : "clean",
  ].join("|");

  const respond = (jpeg: Buffer) =>
    new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${cardFilename(slug, formatParam)}"`,
        // Never let a browser replay a stale card after an edit — the URL is
        // stable but the content isn't. Repeat taps hit the content-keyed
        // origin cache, so this costs nothing.
        "Cache-Control": "no-store",
      },
    });

  const cached = jpegCache.get(cacheKey);
  if (cached) return respond(cached);
  const pending = inflight.get(cacheKey);
  if (pending) {
    try {
      return respond(await pending);
    } catch {
      return new Response("render failed", { status: 500 });
    }
  }
  // Cards may hold at most 1 of the 2 shared slots: a burst of downloads must
  // never starve the OG route (WhatsApp fetches a preview exactly once).
  if (!tryAcquireRenderSlot(1)) {
    return new Response("busy", { status: 503, headers: { "Retry-After": "3" } });
  }
  const job = render(cacheKey);
  inflight.set(cacheKey, job);
  try {
    const jpeg = await job;
    logEvent("card_download", slug, formatParam);
    return respond(jpeg);
  } finally {
    releaseRenderSlot();
    inflight.delete(cacheKey);
  }

  async function render(key: string): Promise<Buffer> {
    const tr = translator(locale);
    const { width, height } = CARD_DIMENSIONS[formatParam as "story" | "print"];
    const s = cardScale(formatParam as "story" | "print");
    const publicUrl = `${BASE_URL}/i/${slug}`;
    const shortUrl = publicUrl.replace(/^https?:\/\//, "");

    const [fonts, bg, qr] = await Promise.all([
      loadFonts(),
      heroDataUri(tpl.heroImage),
      QRCode.toDataURL(publicUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: Math.round(280 * s),
        color: { dark: tpl.palette.ink, light: "#ffffff" },
      }),
    ]);

    const heroH = Math.round(height * 0.32);
    const namesSize = Math.round((names.length > 26 ? 60 : names.length > 16 ? 72 : 84) * s);
    const qrSize = Math.round(200 * s);

    const image = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: tpl.palette.bg,
            fontFamily: "Inter",
          }}
        >
          {/* hero art band, fading into the page background */}
          <div style={{ display: "flex", position: "relative", width, height: heroH }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bg}
              width={width}
              height={heroH}
              style={{ objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width,
                height: Math.round(heroH * 0.4),
                backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0), ${tpl.palette.bg})`,
              }}
            />
          </div>

          {/* the invitation itself */}
          <div
            style={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: `0 ${Math.round(64 * s)}px`,
            }}
          >
            <div
              style={{
                fontSize: Math.round(34 * s),
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: tpl.palette.accent,
                marginBottom: Math.round(28 * s),
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: namesSize,
                fontWeight: 700,
                lineHeight: 1.12,
                color: tpl.palette.ink,
                marginBottom: Math.round(34 * s),
              }}
            >
              {names}
            </div>
            <div
              style={{
                fontSize: Math.round(40 * s),
                color: tpl.palette.ink,
                marginBottom: Math.round(14 * s),
              }}
            >
              {when}
            </div>
            <div style={{ fontSize: Math.round(32 * s), color: tpl.palette.muted }}>
              {venueName}
            </div>
            {landmark && (
              <div
                style={{
                  fontSize: Math.round(26 * s),
                  color: tpl.palette.muted,
                  marginTop: Math.round(10 * s),
                }}
              >
                {landmark}
              </div>
            )}
          </div>

          {/* QR → RSVP link: the forwarded/printed image still converts */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: Math.round(24 * s),
              paddingBottom: Math.round(48 * s),
            }}
          >
            <div
              style={{
                display: "flex",
                padding: Math.round(12 * s),
                backgroundColor: "#ffffff",
                borderRadius: Math.round(16 * s),
                border: `${Math.max(1, Math.round(2 * s))}px solid ${tpl.palette.accentSoft}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={qrSize} height={qrSize} />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxWidth: Math.round(520 * s),
              }}
            >
              <div
                style={{
                  fontSize: Math.round(28 * s),
                  fontWeight: 700,
                  color: tpl.palette.ink,
                  marginBottom: Math.round(8 * s),
                }}
              >
                {tr("card.qr_caption")}
              </div>
              <div style={{ fontSize: Math.round(26 * s), color: tpl.palette.muted }}>
                {shortUrl}
              </div>
            </div>
          </div>

          {watermark && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: `${Math.round(18 * s)}px 0`,
                backgroundColor: tpl.palette.surface,
                borderTop: `${Math.max(1, Math.round(2 * s))}px solid ${tpl.palette.accentSoft}`,
                fontSize: Math.round(24 * s),
                color: tpl.palette.muted,
              }}
            >
              {tr("card.made_on")} · {shortUrl.split("/")[0]}
            </div>
          )}
        </div>
      ),
      { width, height, fonts },
    );

    const png = Buffer.from(await image.arrayBuffer());
    const jpeg = await sharp(png)
      .jpeg({ quality: formatParam === "print" ? 92 : 86, mozjpeg: true })
      .toBuffer();
    jpegCache.set(key, jpeg);
    return jpeg;
  }
}
