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

## Shipped 2026-09-07

3. ~~**Guest phone numbers on the board** + `wa.me/<phone>` direct sends~~ —
   pasted lines carry the number after the name («Айбек 0555 12 34 56»,
   `parseGuestLine`), and the paid tier turns each guest's row into a direct
   WhatsApp chat instead of the contact picker. This is now what the 990 сом
   buys, alongside the A5 print file; watermark removal is no longer the pitch.
   Board also got all/pending/coming filters.

   Also this pass: Cormorant Garamond + Marck Script on the invites (the whole
   card was set in Inter), the ornament plates shown as frames instead of being
   `cover`-cropped to two bands, a real per-template gallery on `/premium`,
   distinct-visitor funnel + Core Web Vitals + a decision-first `/admin/stats`,
   and `/admin/activate` so an mbank transfer can activate a tier while Finik
   is blocked.

## Next up — high impact, low effort

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
7. **Live Finik capture** — the code path is written and manual activation
   covers the gap; unblocking is two operator actions (buy the domain, register
   our RSA public key). Watch `/premium/leads` for the concierge-vs-self-serve
   split in the meantime.

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
