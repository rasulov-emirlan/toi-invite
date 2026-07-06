# Той-Invite

Self-serve **Kyrgyz toi / wedding invitation-site builder**. Кыргызча жана орусча,
som payments, KG event types (свадьба · кыз узатуу · сүннөт той · бешик той ·
юбилей). Fill a short form → get a beautiful shareable link that unfurls nicely in
WhatsApp, with a map, add-to-calendar, and guest RSVP tracking.

Kyrgyzstan has zero productized self-serve invite builders (Kazakhstan has three);
KG families already pay 500–1600 som for hand-made ones on lalafo. This is the
self-serve wedge.

## Stack

- **Next.js 15** (App Router) + **TypeScript 5** + React 19
- **better-sqlite3** for RSVP persistence (single file, WAL)
- Plain CSS (house style for chrome; celebratory per-template palettes for invites)
- **Vitest** for the pure logic (slug, validation, i18n parity, calendar, stats)
- Docker + Traefik for preview deploys

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # vitest
pnpm typecheck
pnpm build
```

RSVPs persist to `./data/toi.db` (override with `DB_PATH`).

## What's inside

| Route | What |
|---|---|
| `/` | Landing (RU/KY toggle via `?lang=`) |
| `/create` | The builder: event type, names, date/time, venue + 2GIS, greeting, template, invite language |
| `/i/<slug>` | Public invite: template art, countdown, details, add-to-calendar, RSVP form. Rich OG/Twitter meta so the link unfurls in WhatsApp/Telegram |
| `/i/<slug>/rsvps?token=<secret>` | Organizer view: coming / not-coming / total-guests + the guest list. Token-gated |
| `POST /api/invites` | Create an invite → `{ slug, token }` |
| `POST /api/rsvp` | Submit a guest RSVP |
| `GET /api/ics/<slug>` | Download an `.ics` calendar file |

## Localization

`src/lib/i18n.ts` holds the RU and KY string tables; a test enforces that every key
exists in both locales. Event types and templates carry their own bilingual labels.
Getting the Kyrgyz right is the whole differentiation vs the KZ players.

## Deploy (preview)

Docker + Traefik (see `docker-compose.yml`). Set `APP_BASE_URL` to the public origin
so OpenGraph image URLs resolve absolute.

```bash
docker compose up -d --build
```

## Not built yet (v0)

Payments (mbank / FreedomPay), per-guest personalized links, photo upload, more
templates, tamada/decorator partner referral cut. See `~/.nightshift/state/toi-invite.md`.
