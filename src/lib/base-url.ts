/**
 * Public origin for absolute URLs (OG images, forwarded share links). The
 * localhost fallback keeps dev working; production sets APP_BASE_URL.
 */
export const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";
