"use client";

/**
 * Fire-and-forget product beacon. Uses sendBeacon when available so the event
 * survives the page unloading right after a share/calendar tap; silently does
 * nothing on failure — analytics must never affect the guest experience.
 */
export function track(name: string, slug?: string): void {
  try {
    const payload = JSON.stringify({ name, slug });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never let a beacon break the page
  }
}
