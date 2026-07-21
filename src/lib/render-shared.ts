import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readPhoto } from "./photos";

/**
 * Shared plumbing for the satori/sharp image surfaces (`/api/og/[slug]` and
 * `/api/card/[slug]`): font + hero-art loading, the global render semaphore,
 * and a bounded JPEG cache. Lives here so the two routes can't each grant
 * themselves a full CPU budget — satori is CPU-bound and there is one container.
 */

/**
 * Inter latin+cyrillic, loaded once per process from the @fontsource package
 * (woff — satori reads ttf/otf/woff, not woff2). Resolved from cwd rather than
 * require.resolve: the bundler would rewrite require.resolve, and both dev and
 * the Docker runtime keep node_modules at cwd. readFile follows pnpm symlinks.
 */
let fontsPromise: Promise<Array<{ name: string; data: Buffer; weight: 400 | 700 }>> | null = null;

export function loadFonts() {
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
    // A transient FS error must not poison the cache with a rejected promise
    // forever (every render would 500 until restart) — drop and retry later.
    fontsPromise.catch(() => {
      fontsPromise = null;
    });
  }
  return fontsPromise;
}

/** Template hero art as a data URI (satori can't fetch relative URLs). */
const heroCache = new Map<string, Promise<string>>();

export function heroDataUri(heroImage: string): Promise<string> {
  let p = heroCache.get(heroImage);
  if (!p) {
    p = readFile(join(process.cwd(), "public", heroImage)).then(
      (buf) => `data:image/jpeg;base64,${buf.toString("base64")}`,
    );
    p.catch(() => heroCache.delete(heroImage));
    heroCache.set(heroImage, p);
  }
  return p;
}

/**
 * The invite's uploaded photo as a data URI, or null when absent/unreadable.
 * Uncached: uploads are per-invite (unlike the handful of template heroes) and
 * already sit re-encoded at ≤1600px on local disk.
 */
export async function photoDataUri(photoId: string | null): Promise<string | null> {
  if (!photoId) return null;
  const buf = await readPhoto(photoId);
  return buf ? `data:image/jpeg;base64,${buf.toString("base64")}` : null;
}

/** #rrggbb → rgba() — satori gradients need explicit alpha stops. */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// At most two satori renders in flight across ALL image routes — one
// container, and a render pins a core for hundreds of ms. Callers that can't
// get a slot answer 503 + Retry-After instead of queueing unboundedly.
// `limit` lets a lower-priority caller cap how deep it may fill the pool:
// card downloads (human-triggered, retryable) pass 1 so an OG fetch
// (crawler, one-shot) always finds a free slot unless OG itself holds both.
let activeRenders = 0;
export const MAX_CONCURRENT_RENDERS = 2;

export function tryAcquireRenderSlot(limit = MAX_CONCURRENT_RENDERS): boolean {
  if (activeRenders >= limit) return false;
  activeRenders++;
  return true;
}

export function releaseRenderSlot(): void {
  activeRenders = Math.max(0, activeRenders - 1);
}

/**
 * Bounded LRU-ish rendered-JPEG cache (Map preserves insert order). Keys must
 * include everything drawn, so an invite edit naturally misses the cache.
 */
export class JpegCache {
  private map = new Map<string, Buffer>();
  constructor(private max: number) {}

  get(key: string): Buffer | undefined {
    return this.map.get(key);
  }

  set(key: string, value: Buffer): void {
    while (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
    this.map.set(key, value);
  }
}
