import "server-only";
import { mkdirSync } from "node:fs";
import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";
import { generateSlug } from "./slug";
import { isValidPhotoId } from "./validation";

/**
 * Invite hero photos. Stored next to the SQLite file so the same Docker volume
 * persists both. Every upload is decoded and re-encoded through sharp — the
 * stored file is always a fresh JPEG we produced ourselves, never the guest's
 * original bytes (kills polyglot/EXIF-bomb concerns), and is capped to a size
 * that looks sharp on a phone without weighing megabytes.
 */
const PHOTO_DIR = join(dirname(resolve(process.env.DB_PATH ?? "./data/toi.db")), "uploads");
const PHOTO_ID_LENGTH = 20;
const MAX_EDGE_PX = 1600;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Decode bombs: a tiny compressed file can declare enormous pixel dimensions.
// 40MP covers any real phone photo; sharp refuses anything above BEFORE
// allocating the decode buffer.
const MAX_INPUT_PIXELS = 40_000_000;

// One container serves everything — bound concurrent decodes so a burst of
// uploads can't stack sharp jobs into an OOM.
const MAX_CONCURRENT_JOBS = 2;
let activeJobs = 0;

// Disk ceiling for the uploads dir (the volume also holds the database).
const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
// Orphan GC: uploads never attached to an invite (abandoned forms, replaced
// photos) are deleted once older than this. Checked lazily, ≤ once/hour.
const ORPHAN_MAX_AGE_MS = 24 * 3600_000;
let lastGcMs = 0;

export type SavePhotoResult =
  | { ok: true; id: string }
  | { ok: false; reason: "busy" | "not_image" | "quota" };

export async function savePhoto(
  input: Buffer,
  isReferenced: (id: string) => boolean,
): Promise<SavePhotoResult> {
  if (activeJobs >= MAX_CONCURRENT_JOBS) return { ok: false, reason: "busy" };
  activeJobs++;
  try {
    mkdirSync(PHOTO_DIR, { recursive: true });
    await gcOrphans(isReferenced);
    if (!(await underQuota())) return { ok: false, reason: "quota" };
    let jpeg: Buffer;
    try {
      jpeg = await sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS })
        .rotate() // honor EXIF orientation, then strip metadata by re-encoding
        .resize(MAX_EDGE_PX, MAX_EDGE_PX, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    } catch {
      return { ok: false, reason: "not_image" }; // undecodable or over pixel limit
    }
    const id = generateSlug(PHOTO_ID_LENGTH);
    await writeFile(join(PHOTO_DIR, `${id}.jpg`), jpeg);
    return { ok: true, id };
  } finally {
    activeJobs--;
  }
}

export async function readPhoto(id: string): Promise<Buffer | null> {
  if (!isValidPhotoId(id)) return null;
  try {
    return await readFile(join(PHOTO_DIR, `${id}.jpg`));
  } catch {
    return null;
  }
}

async function underQuota(): Promise<boolean> {
  try {
    const files = await readdir(PHOTO_DIR);
    let total = 0;
    for (const f of files) {
      try {
        total += (await stat(join(PHOTO_DIR, f))).size;
      } catch {
        /* raced with GC */
      }
    }
    return total < MAX_TOTAL_BYTES;
  } catch {
    return true; // dir missing/unreadable — the write itself will surface it
  }
}

/** Delete uploads that no invite references once they're older than a day. */
async function gcOrphans(isReferenced: (id: string) => boolean): Promise<void> {
  const now = Date.now();
  if (now - lastGcMs < 3600_000) return;
  lastGcMs = now;
  try {
    for (const f of await readdir(PHOTO_DIR)) {
      const id = f.replace(/\.jpg$/, "");
      if (!isValidPhotoId(id) || isReferenced(id)) continue;
      try {
        const s = await stat(join(PHOTO_DIR, f));
        if (now - s.mtimeMs > ORPHAN_MAX_AGE_MS) await unlink(join(PHOTO_DIR, f));
      } catch {
        /* raced — ignore */
      }
    }
  } catch {
    /* GC is best-effort */
  }
}
