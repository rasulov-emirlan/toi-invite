import "server-only";
import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
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

export async function savePhoto(input: Buffer): Promise<string | null> {
  let jpeg: Buffer;
  try {
    jpeg = await sharp(input, { failOn: "error" })
      .rotate() // honor EXIF orientation, then strip metadata by re-encoding
      .resize(MAX_EDGE_PX, MAX_EDGE_PX, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch {
    return null; // not a decodable image
  }
  const id = generateSlug(PHOTO_ID_LENGTH);
  mkdirSync(PHOTO_DIR, { recursive: true });
  await writeFile(join(PHOTO_DIR, `${id}.jpg`), jpeg);
  return id;
}

export async function readPhoto(id: string): Promise<Buffer | null> {
  if (!isValidPhotoId(id)) return null;
  try {
    return await readFile(join(PHOTO_DIR, `${id}.jpg`));
  } catch {
    return null;
  }
}
