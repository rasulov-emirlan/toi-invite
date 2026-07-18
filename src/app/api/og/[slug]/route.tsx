import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { getInvite } from "@/lib/db";
import { isValidSlug } from "@/lib/slug";
import { isLocale } from "@/lib/i18n";
import { getTemplate } from "@/lib/templates";
import { displayNames, eventLabel, formatEventDate } from "@/lib/invite-view";
import { clientKey, ogLimiter } from "@/lib/ratelimit";
import type { Locale } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Inter latin+cyrillic, loaded once per process from the @fontsource package
 * (woff — satori reads ttf/otf/woff, not woff2). Resolved from cwd rather than
 * require.resolve: the bundler would rewrite require.resolve, and both dev and
 * the Docker runtime keep node_modules at cwd. readFile follows pnpm symlinks.
 */
let fontsPromise: Promise<Array<{ name: string; data: Buffer; weight: 400 | 700 }>> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    const dir = join(process.cwd(), "node_modules", "@fontsource", "inter", "files");
    fontsPromise = Promise.all(
      (
        [
          ["inter-latin-400-normal.woff", 400],
          ["inter-cyrillic-400-normal.woff", 400],
          ["inter-latin-700-normal.woff", 700],
          ["inter-cyrillic-700-normal.woff", 700],
        ] as const
      ).map(async ([file, weight]) => ({
        name: "Inter",
        data: await readFile(join(dir, file)),
        weight,
      })),
    );
  }
  return fontsPromise;
}

/** Template hero art as a data URI (satori can't fetch relative URLs). */
const heroCache = new Map<string, Promise<string>>();

function heroDataUri(heroImage: string): Promise<string> {
  let p = heroCache.get(heroImage);
  if (!p) {
    p = readFile(join(process.cwd(), "public", heroImage)).then(
      (buf) => `data:image/jpeg;base64,${buf.toString("base64")}`,
    );
    heroCache.set(heroImage, p);
  }
  return p;
}

/**
 * Rendered-JPEG cache: satori + sharp burn real CPU and WhatsApp's client
 * cache doesn't protect the origin. Key includes everything drawn, so an edit
 * naturally misses the cache; bounded LRU-ish (Map preserves insert order).
 */
const jpegCache = new Map<string, Buffer>();
const JPEG_CACHE_MAX = 300;

// At most two renders in flight — one container, satori is CPU-bound.
let activeRenders = 0;
const MAX_CONCURRENT_RENDERS = 2;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = ogLimiter.check(clientKey(req, "og"), Date.now());
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

  const langParam = new URL(req.url).searchParams.get("lang");
  const locale: Locale = isLocale(langParam) ? langParam : invite.locale;
  const tpl = getTemplate(invite.template);

  const names = displayNames(invite, locale);
  const label = eventLabel(invite, locale);
  const when = `${formatEventDate(invite.event_date, locale)} · ${invite.event_time}`;

  const venueName = invite.venue_name;
  const cacheKey = [slug, locale, invite.template, names, when, venueName].join("|");
  const cached = jpegCache.get(cacheKey);
  if (cached) return jpegResponse(cached);
  if (activeRenders >= MAX_CONCURRENT_RENDERS) {
    return new Response("busy", { status: 503, headers: { "Retry-After": "3" } });
  }
  activeRenders++;
  try {
    return jpegResponse(await render(cacheKey));
  } finally {
    activeRenders--;
  }

  async function render(key: string): Promise<Buffer> {

  const [fonts, bg] = await Promise.all([loadFonts(), heroDataUri(tpl.heroImage)]);

  const namesSize = names.length > 26 ? 54 : names.length > 16 ? 64 : 76;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tpl.palette.bg,
          fontFamily: "Inter",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bg}
          width={WIDTH}
          height={HEIGHT}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            maxWidth: 860,
            padding: "0 40px",
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: tpl.palette.accent,
              marginBottom: 22,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: namesSize,
              fontWeight: 700,
              lineHeight: 1.15,
              color: tpl.palette.ink,
              marginBottom: 26,
            }}
          >
            {names}
          </div>
          <div style={{ fontSize: 34, color: tpl.palette.ink, marginBottom: 10 }}>
            {when}
          </div>
          <div style={{ fontSize: 28, color: tpl.palette.muted }}>
            {venueName}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts },
  );

    // ImageResponse only emits PNG (~1.2MB with the ornament art) — WhatsApp
    // quietly drops og:images that big. Transcode to JPEG (~100KB).
    const png = Buffer.from(await image.arrayBuffer());
    const jpeg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    while (jpegCache.size >= JPEG_CACHE_MAX) {
      const oldest = jpegCache.keys().next().value;
      if (oldest === undefined) break;
      jpegCache.delete(oldest);
    }
    jpegCache.set(key, jpeg);
    return jpeg;
  }
}

function jpegResponse(jpeg: Buffer): Response {
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      // Client-side cache only; the origin-side cache above is keyed on the
      // drawn content, so edits show up as soon as WhatsApp refetches.
      "Cache-Control": "public, max-age=600",
    },
  });
}
