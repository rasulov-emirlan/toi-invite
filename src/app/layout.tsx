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
import { BASE_URL } from "@/lib/base-url";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Той-Invite — онлайн-пригласительный на той",
  description:
    "Создайте красивое приглашение на той за 5 минут. Кыргызча жана орусча, с картой, календарём и учётом гостей.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
