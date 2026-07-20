# Той-Invite — distribution kit (seed the validation)

Paste-ready copy to start getting real signal. The product is **live** and free during
beta: **https://toi.night.enkiduck.com**

**The bet:** KG families will self-serve a digital toi invite (кыргызча + русский, som
rails, KG event types) instead of paying a lalafo hand-maker 500–1600 som. Kazakhstan has
3 productized players (shaqyru24.kz, online-shaqyru.kz, toyga-shaqyru.kz); **Kyrgyzstan has
zero.** The invite spreads through WhatsApp family groups — the link unfurls with a real
image (OpenGraph is wired), so a shared link already looks finished.

**New since the first kit (2026-07-19/20):** the product now also makes the exact thing
lalafo makers sell — a **downloadable открытка** (story-format JPG for WhatsApp + A5 print
version with a QR code to the RSVP page). Plus: guest board with personal links, gift
wishlist, **реквизиты для поздравлений** (mbank/Optima + кнопка «копировать»), photo
upload, 6 templates incl. Kyrgyz оймо, RSVP deadlines, programme. Lead with the открытка —
it's the format the market already buys.

## Before you seed — make a demo invite + grab its images

1. Create one polished example via **/create** (wedding, ornament_gold, with photo,
   programme and реквизиты) and keep its `/i/<slug>` link as «вот пример».
2. On the organizer page hit **«Скачать открытку (JPG)»** and **«Открытка для печати
   (A5, QR)»** — these two images are your listing photos / reel frames. They carry the
   «Создано на Той·Invite» footer, which is exactly the point.

## Signal to watch & go/kill

- **Watch:** invites created + RSVPs submitted + `card_download` events
  (`/admin/stats?token=…`, or row counts — inspect command in `experiments.md`).
- **GO** (push distribution harder + unblock payments): ≥10 real invites in 14 days, OR
  ≥5 + organic WhatsApp shares.
- **KILL / pivot to concierge («сделаем за вас»):** <3 invites in 14 days despite ≥1,000
  reel/listing views → buyers want a human designer, not a tool. (The «Под ключ» 1990-som
  fake-door tier on /premium already measures this appetite — watch `/premium/leads`.)

---

## 1. Lalafo — listing (RU)

The category buyers already search («электронные пригласительные») had weak competition at
research time. Undercut on **speed**, not just price — and note we now hand over the same
JPG the hand-makers deliver, instantly.

> **Онлайн-пригласительный на той за 5 минут — кыргызча и на русском**
>
> Свадьба, кыз узатуу, сүннөт той, бешик той, юбилей. Заполняете детали — получаете
> красивую ссылку-приглашение с картой 2ГИС, датой, обратным отсчётом и учётом гостей
> (кто придёт / сколько человек). Отправляете в WhatsApp — раскрывается красиво.
>
> ✅ Кыргызча жана орусча
> ✅ Готово за 5 минут, а не за 1–2 дня
> ✅ Открытка-картинка для WhatsApp и печати (с QR-кодом) — скачиваете сразу
> ✅ Гости отвечают «келем / келбейм» прямо в приглашении
> ✅ Реквизиты для поздравлений (mbank и др.) с кнопкой «копировать»
> ✅ Именные ссылки для каждого гостя
>
> Пример: <ВСТАВЬТЕ ССЫЛКУ НА ДЕМО>
> Попробовать: toi.night.enkiduck.com

## 1b. Lalafo — listing (KY)

> **Тойго онлайн чакыруу — 5 мүнөттө, кыргызча**
>
> Үйлөнүү тою, кыз узатуу, сүннөт той, бешик той, юбилей. Маалыматты толтурасыз — 2ГИС
> картасы, күнү, тескери саноо жана меймандарды эсептөө бар кооз чакыруу-шилтеме аласыз.
> WhatsApp'ка жөнөтөсүз — кооз ачылат.
>
> ✅ Кыргызча жана орусча
> ✅ 1–2 күн эмес, 5 мүнөттө даяр
> ✅ WhatsApp жана басып чыгаруу үчүн открытка (QR менен) — дароо жүктөп аласыз
> ✅ Меймандар «келем / келбейм» деп ошол эле жерде жооп беришет
> ✅ Куттуктоо үчүн реквизиттер (mbank ж.б.) «көчүрүү» баскычы менен
> ✅ Ар бир мейманга жеке шилтеме
>
> Мисал: <ДЕМО ШИЛТЕМЕ>
> Байкап көрүү: toi.night.enkiduck.com

## 2. Instagram / TikTok reel caption

Template-showcase reels are how the KZ services grew. The reel itself: screen-record
/create → preview → готовая открытка (use the downloaded story JPG as the closing frame).

> Той чакырууну 5 мүнөттө жасаса болот экен 🤯 Кыргызча да, орусча да.
> Карта, тескери саноо, меймандарды эсептөө, даяр открытка — баары бар. Шилтеме профилде 👆
> #той #кызузатуу #свадьбабишкек #kyrgyzstan #той2026

## 3. Тамада / decor-studio partners (the compounding channel)

Offer a **20–30% referral cut** to тамада and decor studios who upsell it into every toi
they work. This is the channel that compounds — pitch it directly, not as a listing. The
A5-с-QR печатная открытка is the artifact to show them: it slots into the decor package
they already sell.

## Notes

- **Payments are built** (Finik acquiring, Премиум 990 som) but checkout is blocked until
  Finik registers our RSA public key (ticket tkt-b624, operator action). Until then paid
  tiers degrade to lead capture — orders can be fulfilled by hand / mbank transfer.
- Peak toi season is **Aug–Nov** — seeding now (shoulder season) is validation; the volume
  test is the autumn.
- Everything factual here traces to the deep dive:
  `~/.nightshift/reports/playground/20260704-0130-sweep-390b.md` §3.
