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
| `/` | Landing (RU/KY toggle via `?lang=`) + server-side «Мои приглашения» (HttpOnly organizer cookie) |
| `/create` | The builder: event type, names, date/time, venue + 2GIS (link auto-normalized), bilingual RU+KY greeting tabs, photo upload, host contact, landmark, dress code, RSVP deadline, programme, 6 templates (classic + Kyrgyz oimo ornament) |
| `/i/<slug>` | Public invite: template art, optional hero photo, countdown, details, programme, host WhatsApp/call, add-to-calendar, RSVP form. Per-invite **dynamic OG card** (names/date rendered into the image) so the link unfurls personalized in WhatsApp/Telegram |
| `/i/<slug>/rsvps?token=<secret>` | Organizer view: stats, RSVP list (mobile card layout), gift wishlist, **guest board** (invited / opened / coming / declined + personal links + WhatsApp reminders) |
| `/admin/stats?token=<ADMIN_TOKEN>` | Operator product stats: funnel events, viral-loop attribution, top invites |
| `POST /api/invites` | Create an invite → `{ slug, token }`; sets the organizer cookie |
| `POST /api/rsvp` | Submit a guest RSVP (dedupe by browser ref, links to guest board via `?g=`) |
| `POST /api/photo` / `GET /api/photo/<id>` | Hero-photo upload (re-encoded via sharp) / serving |
| `GET /api/og/<slug>` | Dynamic 1200×630 OG card (satori → JPEG) |
| `GET /api/ics/<slug>` | Download an `.ics` calendar file |
| `POST /api/track` | First-party analytics beacon (share/calendar/create-own clicks) |
| `POST /api/vitals` | Core Web Vitals beacon (LCP/INP/CLS, bucketed by page shape) |
| `/admin/activate?token=<ADMIN_TOKEN>` | Operator: turn on a paid tier after an mbank transfer |

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

## Premium

`/premium` shows three tiers: free · **Премиум 990 сом** · Под ключ 1990 сом.
(A fourth, «Про», stays in `PREMIUM_TIERS` but `hidden` until the features it
promises exist — see `src/lib/premium.ts`.)

The split is what the free tier gives away vs what the paid tier is *for*:

| | Free | Премиум |
|---|---|---|
| Invite site, 6 designs, RSVP, guest board | ✓ | ✓ |
| Story card + video invite (watermarked) | ✓ | clean |
| Gift list, money-gift requisites, CSV for the тамада | ✓ | ✓ |
| **One-tap personal WhatsApp to each guest** (`wa.me/<number>`) | — | ✓ |
| **A5 300dpi print file** | — | ✓ |
| No «Той-Invite» wordmark | — | ✓ |

The free tier is the distribution engine — the watermarked story card and video
are what get forwarded. The paid tier is the labour saver for a 150-guest toi.

**Taking money.** Finik acquiring is wired (`POST /api/pay` → checkout →
signed webhook → `setInvitePremium`) but needs a real domain + our RSA public
key registered with Finik. Until then, `/admin/activate?token=<ADMIN_TOKEN>`
turns an mbank transfer into an activated tier by hand; it logs
`payment_succeeded` with `ref=manual:<tier>` so manual revenue shows up in the
funnel next to card payments. Interest leads still land in `premium_interest`
(`/premium/leads?token=…`, CSV at `/api/premium-leads?token=…`).

## Analytics

First-party, no third-party tag (guests are on cheap Androids inside the
WhatsApp WebView). Two tables:

- **`events`** — product events carrying an anonymous `sid` (HttpOnly cookie
  minted in the middleware). `src/lib/funnel.ts` defines the ordered funnel;
  `funnelCounts` counts **distinct visitors** per step, so a reload is one
  person. `/admin/stats?token=…` renders it plus the K-factor.
- **`web_vitals`** — LCP/INP/CLS from real devices via `useReportWebVitals`
  (`src/components/WebVitals.tsx`), bucketed by page *shape* (`landing`,
  `create`, `invite`, `premium`) rather than path, so no invite slug is ever
  stored. `vitalsP75` does nearest-rank p75 in SQL.

## Not built yet

Live Finik capture (blocked on the domain + RSA key registration),
phone/WhatsApp login (organizer identity is cookie+localStorage today),
per-event-type art variants, tamada/decorator partner referral cut.
See `~/.nightshift/state/toi-invite.md`.
