import type { Metadata } from "next";
// Self-hosted fonts (latin + cyrillic subsets served from our origin) — no
// Google Fonts runtime dependency, which flashes or fails inside the WhatsApp
// and Telegram in-app WebViews most guests open invites in.
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

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
