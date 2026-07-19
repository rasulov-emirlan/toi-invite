import type { Metadata } from "next";
// Self-hosted fonts (latin + cyrillic subsets served from our origin) — no
// Google Fonts runtime dependency, which flashes or fails inside the WhatsApp
// and Telegram in-app WebViews most guests open invites in.
// (No display webfont: the site is Cyrillic-first and Space Grotesk has no
// Cyrillic glyphs — headings would silently fall back to system-ui anyway,
// while every visitor still paid for the woff2. Inter covers both scripts.)
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { headers } from "next/headers";
import { BASE_URL } from "@/lib/base-url";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Той-Invite — онлайн-пригласительный на той",
  description:
    "Создайте красивое приглашение на той за 5 минут. Кыргызча жана орусча, с картой, календарём и учётом гостей.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by middleware from a validated ?lang param; invite pages override
  // their own subtree with the invite's stored locale.
  const lang = (await headers()).get("x-ui-lang") ?? "ru";
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
