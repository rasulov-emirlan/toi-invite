"use client";

import { useEffect } from "react";

/**
 * Stamps the guest board's "opened" state from the CLIENT — a WhatsApp or
 * Telegram preview crawler fetches personalized URLs server-side and must not
 * count as the guest opening their invite. Fires once per mount; the server
 * keeps only the first stamp.
 */
export default function StampOpen({ slug, guest }: { slug: string; guest: string }) {
  useEffect(() => {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "guest_open", slug, g: guest }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, guest]);
  return null;
}
