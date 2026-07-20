# Той-Invite — roadmap to "wedding management for modern Kyrgyzstan"

Distilled from the 2026-07-19 three-lens audit (product / UX / frontend) plus the
optimization pass that shipped with it. The through-line of the audit: **the
product today is optimized for the guest who clicks a link, but the KG toi
economy runs on images forwarded in WhatsApp and cash in envelopes.** The
cheapest bridges to that reality are also the most monetizable.

## Shipped in the audit pass (2026-07-19)

Guest flow (choice-first RSVP, segmented count, closed-after-deadline, sticky
answer CTA), create flow (template-first, draft rescue for WhatsApp WebView,
field-level errors, mobile preview, send-organizer-link-to-self), organizer
board (bulk paste, clipboard fallback, confirm remove), Telegram share
everywhere WhatsApp is, landing OG card + hero invite peek, Cyrillic-capable
display font + humanized guest typography, concierge fake-door tier, analytics
hardening + db tests.

## Shipped 2026-07-20 (PR #15)

1. ~~**Downloadable image invite**~~ — `/api/card/[slug]?format=story|print`
   (1080×1920 story + A5 300dpi with QR → RSVP link), watermarked on free /
   clean on premium; download buttons on create-success + organizer ShareBar.
2. ~~**Money-gift block**~~ — up to 5 requisites per invite, one-tap copy,
   free tier (adoption driver); the premium unlock is the watermark-free
   открытка instead. Follow-up idea kept: a private «кто поздравил» thank-you
   ledger for the organizer.

## Next up — high impact, low effort

3. **Guest phone numbers on the board** + `wa.me/<phone>` direct sends. Turns
   reminders from copy-paste labor into one tap per guest — that *is* the
   management job for a 150-guest toi.

## Structural bets (multi-day)

4. **Organizer identity via phone/WhatsApp** — everything durable (multi-toi
   dashboard, budgets, paid activation) sits today on a losable URL + cookie.
   Prerequisite for the rest of this list; the send-self-link button is the
   stopgap.
5. **Multi-event toi sequences** (кыз узатуу → нике → свадьба in one dashboard,
   shared guest list, per-event RSVP). Promised in the Pro tier copy, matches
   real KG toi structure, no competitor does it.
6. **Day-of banquet mode** — check-in toggle on the guest list, printable
   seating/table list («для тамады»). The tamada is the strongest referral
   channel in this market.
7. **Real payments (mbank/FreedomPay)** — only after the fake-door + concierge
   signals say which tier to build. Watch `/premium/leads` for the
   concierge-vs-cosmetics split.

## Deliberately not now

- Budget tracker / vendor marketplace — real parts of the job, but pointless
  before organizer identity (4) exists; a budget on a losable URL won't retain.
- Server-rendered per-locale i18n split (bundle currently ships both locales,
  ~20 KB) — worth doing opportunistically, not as a project.

## Known engineering follow-ups

- i18n dictionary ships to every client component in full (both locales) —
  split per locale or pass strings as props if bundle size starts to matter.
- Organizer/admin tokens ride query strings (Traefik access logs, browser
  history). Referrer-Policy covers referer leaks; a cookie/header gate for
  `/admin/stats` would be cleaner.
- Photo upload is unauthenticated (bounded by rate limit + 24h orphan GC +
  re-encode); tie uploads to a created invite if abuse ever shows up.
