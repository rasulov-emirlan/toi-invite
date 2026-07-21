import "server-only";
import { mkdirSync } from "node:fs";
import { readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import QRCode from "qrcode";
import { ImageResponse } from "next/og";
import ffmpegPath from "ffmpeg-static";
import { BASE_URL } from "./base-url";
import { translator } from "./i18n";
import { getTemplate, type TemplateConfig } from "./templates";
import { displayNames, eventLabel, formatEventDate, greetingFor } from "./invite-view";
import { heroDataUri, loadFonts, photoDataUri } from "./render-shared";
import {
  SCENE_H,
  SCENE_W,
  buildFilterGraph,
  planScenes,
  totalDurationSec,
  videoCacheKey,
  videoFilename,
  type SceneKind,
} from "./video-plan";
import type { InviteRecord, Locale } from "./types";

/**
 * Rendering half of the video-invite generator: satori scene stills → ffmpeg
 * (Ken Burns + crossfades + CC0 music bed) → content-addressed MP4 on the
 * data volume. One render at a time — an encode pins a core for tens of
 * seconds and there is one container; callers poll until the file exists.
 */

const VIDEO_DIR = join(dirname(resolve(process.env.DB_PATH ?? "./data/toi.db")), "videos");
const MUSIC_PATH = join(process.cwd(), "public", "music", "lovely-piano.mp3");
const FFMPEG_TIMEOUT_MS = 4 * 60_000;
/** Disk ceiling for rendered videos (the volume also holds DB + uploads). */
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024; // 1 GB

export type VideoStatus = "ready" | "rendering" | "error";

let rendering = false;
/** Failed keys keep their error briefly so a poll loop sees it once, then a
 *  later click may retry (the failure may have been transient load). */
const failed = new Map<string, number>();
const FAILURE_TTL_MS = 60_000;

function cacheKeyFor(invite: InviteRecord, locale: Locale): string {
  return videoCacheKey([
    invite.slug,
    locale,
    invite.template,
    invite.event_type,
    invite.honoree,
    invite.partner,
    invite.event_date,
    invite.event_time,
    invite.venue_name,
    invite.landmark,
    greetingFor(invite, locale),
    invite.photo_id,
    invite.premium_tier ? "clean" : "wm",
  ]);
}

export function videoPathFor(invite: InviteRecord, locale: Locale): string {
  return join(VIDEO_DIR, videoFilename(invite.slug, cacheKeyFor(invite, locale)));
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Report the video's state, kicking off a render when it is missing and the
 * single render slot is free. "rendering" also covers "waiting for the slot"
 * — the client polls, and a later poll grabs the slot.
 */
export async function ensureVideo(invite: InviteRecord, locale: Locale): Promise<VideoStatus> {
  const key = cacheKeyFor(invite, locale);
  const path = join(VIDEO_DIR, videoFilename(invite.slug, key));
  if (await exists(path)) return "ready";

  const failedAt = failed.get(key);
  if (failedAt !== undefined) {
    if (Date.now() - failedAt < FAILURE_TTL_MS) return "error";
    failed.delete(key);
  }

  if (rendering) return "rendering";
  rendering = true;
  void render(invite, locale, key, path)
    .catch((err) => {
      console.error(`video render failed for ${invite.slug}`, err);
      failed.set(key, Date.now());
    })
    .finally(() => {
      rendering = false;
    });
  return "rendering";
}

async function render(
  invite: InviteRecord,
  locale: Locale,
  key: string,
  outPath: string,
): Promise<void> {
  mkdirSync(VIDEO_DIR, { recursive: true });
  await gcVideos();

  const scenes = planScenes(Boolean(invite.photo_id));
  const stills = await renderScenes(invite, locale, scenes);

  const workDir = join(tmpdir(), `toi-video-${key}`);
  mkdirSync(workDir, { recursive: true });
  try {
    const inputs: string[] = [];
    for (let i = 0; i < stills.length; i++) {
      const p = join(workDir, `scene${i}.png`);
      await writeFile(p, stills[i]);
      inputs.push("-i", p);
    }

    const tmpOut = join(workDir, "out.mp4");
    const total = totalDurationSec(scenes.length);
    const args = [
      "-y",
      ...inputs,
      "-i", MUSIC_PATH,
      "-filter_complex", buildFilterGraph(scenes.length),
      "-map", "[vout]",
      "-map", "[aout]",
      "-c:v", "libx264",
      "-profile:v", "main",
      "-preset", "veryfast",
      "-crf", "23",
      "-maxrate", "1600k",
      "-bufsize", "3200k",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "96k",
      "-t", total.toFixed(2),
      tmpOut,
    ];
    await runFfmpeg(args);

    // Publish atomically, then drop stale renders of the same invite (edits
    // change the key, so old files would otherwise linger until GC).
    await rename(tmpOut, outPath).catch(async () => {
      // /tmp and the data volume may be different filesystems.
      const buf = await import("node:fs/promises").then((fs) => fs.readFile(tmpOut));
      await writeFile(outPath, buf);
    });
    for (const f of await readdir(VIDEO_DIR)) {
      if (f.startsWith(`${invite.slug}-`) && f !== videoFilename(invite.slug, key)) {
        await unlink(join(VIDEO_DIR, f)).catch(() => {});
      }
    }
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary missing"));
      return;
    }
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderrTail = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-4000);
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ffmpeg timed out"));
    }, FFMPEG_TIMEOUT_MS);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else reject(new Error(`ffmpeg exited ${code}: …${stderrTail.slice(-600)}`));
    });
  });
}

/** Oldest-first prune when the videos dir outgrows its disk budget. */
async function gcVideos(): Promise<void> {
  try {
    const entries: Array<{ path: string; size: number; mtime: number }> = [];
    for (const f of await readdir(VIDEO_DIR)) {
      try {
        const s = await stat(join(VIDEO_DIR, f));
        entries.push({ path: join(VIDEO_DIR, f), size: s.size, mtime: s.mtimeMs });
      } catch {
        /* raced */
      }
    }
    let total = entries.reduce((sum, e) => sum + e.size, 0);
    entries.sort((a, b) => a.mtime - b.mtime);
    for (const e of entries) {
      if (total < MAX_TOTAL_BYTES) break;
      await unlink(e.path).catch(() => {});
      total -= e.size;
    }
  } catch {
    /* GC is best-effort */
  }
}

// ---------- scene stills (satori) ----------

async function renderScenes(
  invite: InviteRecord,
  locale: Locale,
  scenes: SceneKind[],
): Promise<Buffer[]> {
  const tpl = getTemplate(invite.template);
  const tr = translator(locale);
  const publicUrl = `${BASE_URL}/i/${invite.slug}`;

  const [fonts, art, photo, qr] = await Promise.all([
    loadFonts(),
    heroDataUri(tpl.heroImage),
    photoDataUri(invite.photo_id).catch(() => null),
    QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 560,
      color: { dark: tpl.palette.ink, light: "#ffffff" },
    }),
  ]);

  const ctx: SceneContext = {
    invite,
    locale,
    tpl,
    tr,
    art,
    photo,
    qr,
    shortUrl: publicUrl.replace(/^https?:\/\//, ""),
  };

  const out: Buffer[] = [];
  for (const kind of scenes) {
    const image = new ImageResponse(sceneElement(kind, ctx), {
      width: SCENE_W,
      height: SCENE_H,
      fonts,
    });
    out.push(Buffer.from(await image.arrayBuffer()));
  }
  return out;
}

interface SceneContext {
  invite: InviteRecord;
  locale: Locale;
  tpl: TemplateConfig;
  tr: ReturnType<typeof translator>;
  art: string;
  photo: string | null;
  qr: string;
  shortUrl: string;
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function sceneElement(kind: SceneKind, ctx: SceneContext): React.ReactElement {
  switch (kind) {
    case "opening":
      return openingScene(ctx);
    case "names":
      return namesScene(ctx);
    case "photo":
      return photoScene(ctx);
    case "date":
      return dateScene(ctx);
    case "venue":
      return venueScene(ctx);
    case "greeting":
      return greetingScene(ctx);
    case "cta":
      return ctaScene(ctx);
  }
}

/** Scene chrome. Children come as a keyed array — satori mislays a JSX
 *  fragment passed through props (the column layout collapses to a row). */
function frame(tpl: TemplateConfig, children: React.ReactNode[]): React.ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        backgroundColor: tpl.palette.bg,
        fontFamily: "Inter",
        padding: "0 90px",
      }}
    >
      {children}
    </div>
  );
}

function kicker(tpl: TemplateConfig, text: string): React.ReactElement {
  return (
    <div
      style={{
        fontSize: 40,
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: tpl.palette.accent,
      }}
    >
      {text}
    </div>
  );
}

function rule(tpl: TemplateConfig): React.ReactElement {
  return <div style={{ width: 120, height: 3, backgroundColor: tpl.palette.accent }} />;
}

function openingScene(ctx: SceneContext): React.ReactElement {
  const { invite, locale, tpl, tr, art } = ctx;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        backgroundColor: tpl.palette.bg,
        fontFamily: "Inter",
        padding: "0 90px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={art}
        width={SCENE_W}
        height={SCENE_H}
        style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
      />
      {/* light veil so the title reads over any template art */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SCENE_W,
          height: SCENE_H,
          backgroundColor: rgba(tpl.palette.bg, 0.5),
        }}
      />
      {kicker(tpl, eventLabel(invite, locale))}
      <div style={{ display: "flex", margin: "48px 0" }}>{rule(tpl)}</div>
      <div style={{ fontSize: 112, fontWeight: 700, color: tpl.palette.ink }}>
        {tr("video.opening_title")}
      </div>
      <div style={{ display: "flex", margin: "48px 0" }}>{rule(tpl)}</div>
    </div>
  );
}

function namesScene(ctx: SceneContext): React.ReactElement {
  const { invite, locale, tpl } = ctx;
  const names = displayNames(invite, locale);
  return frame(tpl, [
    <div key="k" style={{ display: "flex" }}>{kicker(tpl, eventLabel(invite, locale))}</div>,
    <div key="r" style={{ display: "flex", margin: "44px 0" }}>{rule(tpl)}</div>,
    <div
      key="names"
      style={{
        fontSize: names.length > 26 ? 84 : names.length > 16 ? 100 : 116,
        fontWeight: 700,
        lineHeight: 1.12,
        color: tpl.palette.ink,
      }}
    >
      {names}
    </div>,
    <div key="date" style={{ display: "flex", marginTop: 48, fontSize: 44, color: tpl.palette.muted }}>
      {formatEventDate(invite.event_date, locale)}
    </div>,
  ]);
}

function photoScene(ctx: SceneContext): React.ReactElement {
  const { invite, locale, tpl, photo } = ctx;
  const names = displayNames(invite, locale);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        backgroundColor: tpl.palette.bg,
        fontFamily: "Inter",
      }}
    >
      {photo && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photo}
          width={SCENE_W}
          height={SCENE_H}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: SCENE_W,
          height: 640,
          backgroundImage: `linear-gradient(to bottom, ${rgba(tpl.palette.ink, 0)}, ${rgba(tpl.palette.ink, 0.55)})`,
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 72,
          fontWeight: 700,
          color: "#ffffff",
          marginBottom: 110,
          textShadow: "0 2px 18px rgba(0,0,0,0.45)",
        }}
      >
        {names}
      </div>
    </div>
  );
}

function dateScene(ctx: SceneContext): React.ReactElement {
  const { invite, locale, tpl, tr } = ctx;
  const [, , d] = invite.event_date.split("-").map(Number);
  const dateLine = formatEventDate(invite.event_date, locale);
  // "12 сентября 2026" → the words after the day number.
  const rest = dateLine.replace(/^\d+[-\s]?/, "");
  return frame(tpl, [
    <div
      key="day"
      style={{
        fontSize: 300,
        fontWeight: 700,
        lineHeight: 1,
        color: tpl.palette.accent,
      }}
    >
      {String(d)}
    </div>,
    <div key="rest" style={{ display: "flex", fontSize: 58, color: tpl.palette.ink, marginTop: 18 }}>
      {rest}
    </div>,
    <div key="r" style={{ display: "flex", margin: "48px 0" }}>{rule(tpl)}</div>,
    <div key="time" style={{ display: "flex", fontSize: 48, color: tpl.palette.muted }}>
      {tr("video.time_at")} {invite.event_time}
    </div>,
  ]);
}

function venueScene(ctx: SceneContext): React.ReactElement {
  const { invite, tpl, tr } = ctx;
  return frame(tpl, [
    <div key="k" style={{ display: "flex" }}>{kicker(tpl, tr("video.venue_kicker"))}</div>,
    <div key="r" style={{ display: "flex", margin: "44px 0" }}>{rule(tpl)}</div>,
    <div
      key="venue"
      style={{
        fontSize: invite.venue_name.length > 40 ? 60 : 76,
        fontWeight: 700,
        lineHeight: 1.15,
        color: tpl.palette.ink,
      }}
    >
      {invite.venue_name}
    </div>,
    invite.landmark ? (
      <div key="lm" style={{ display: "flex", marginTop: 36, fontSize: 44, color: tpl.palette.muted }}>
        {invite.landmark}
      </div>
    ) : null,
  ]);
}

function greetingScene(ctx: SceneContext): React.ReactElement {
  const { invite, locale, tpl } = ctx;
  let text = greetingFor(invite, locale);
  if (text.length > 220) text = `${text.slice(0, 220).trimEnd()}…`;
  return frame(tpl, [
    <div key="q" style={{ fontSize: 130, lineHeight: 1, color: tpl.palette.accentSoft, fontWeight: 700 }}>
      «
    </div>,
    <div
      key="text"
      style={{
        fontSize: text.length > 140 ? 48 : 56,
        lineHeight: 1.4,
        color: tpl.palette.ink,
        marginTop: 8,
      }}
    >
      {text}
    </div>,
  ]);
}

function ctaScene(ctx: SceneContext): React.ReactElement {
  const { invite, tpl, tr, qr, shortUrl } = ctx;
  const watermark = !invite.premium_tier;
  return frame(tpl, [
    <div
      key="qr"
      style={{
        display: "flex",
        padding: 26,
        backgroundColor: "#ffffff",
        borderRadius: 28,
        border: `4px solid ${tpl.palette.accentSoft}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} width={430} height={430} />
    </div>,
    <div
      key="caption"
      style={{
        display: "flex",
        marginTop: 54,
        fontSize: 46,
        fontWeight: 700,
        color: tpl.palette.ink,
        maxWidth: 760,
      }}
    >
      {tr("card.qr_caption")}
    </div>,
    <div key="url" style={{ display: "flex", marginTop: 22, fontSize: 42, color: tpl.palette.muted }}>
      {shortUrl}
    </div>,
    watermark ? (
      // High enough to survive the Ken Burns crop (zoom 1.13 eats ~6% per edge).
      <div
        key="wm"
        style={{
          display: "flex",
          position: "absolute",
          bottom: 160,
          fontSize: 34,
          color: tpl.palette.muted,
        }}
      >
        {tr("card.made_on")} · {shortUrl.split("/")[0]}
      </div>
    ) : null,
  ]);
}
