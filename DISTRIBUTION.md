# Той-Invite — distribution kit (seed the validation)

Paste-ready copy to start getting real signal. The product is **live** and free during
beta: **https://toi.night.enkiduck.com**

**The bet:** KG families will self-serve a digital toi invite (кыргызча + русский, som
rails, KG event types) instead of paying a lalafo hand-maker 500–1600 som. Kazakhstan has
3 productized players (shaqyru24.kz, online-shaqyru.kz, toyga-shaqyru.kz); **Kyrgyzstan has
zero.** The invite spreads through WhatsApp family groups — the link unfurls with a real
image (OpenGraph is wired), so a shared link already looks finished.

## Before you seed — make a demo invite

Create one polished example via **/create** (e.g. a wedding, gold or emerald template) and
use its `/i/<slug>` link as "вот пример" in every listing/reel. Keep the builder's baseline
clean: as of hand-off the live DB has **0 invites** (see `~/.nightshift/state/experiments.md`).

## Signal to watch & go/kill

- **Watch:** invites created + RSVPs submitted (row counts — inspect command in
  `experiments.md`).
- **GO** (build payments + push distribution): ≥10 real invites in 14 days, OR ≥5 + organic
  WhatsApp shares.
- **KILL / pivot to concierge ("сделаем за вас"):** <3 invites in 14 days despite ≥1,000
  reel/listing views → buyers want a human designer, not a tool.

---

## 1. Lalafo — listing (RU)

The category buyers already search ("электронные пригласительные") had weak competition at
research time. Undercut on **speed**, not just price.

> **Онлайн-пригласительный на той за 5 минут — кыргызча и на русском**
>
> Свадьба, кыз узатуу, сүннөт той, бешик той, юбилей. Заполняете детали — получаете
> красивую ссылку-приглашение с картой 2ГИС, датой, обратным отсчётом и учётом гостей
> (кто придёт / сколько человек). Отправляете в WhatsApp — раскрывается красиво.
>
> ✅ Кыргызча жана орусча
> ✅ Готово за 5 минут, а не за 1–2 дня
> ✅ Гости отвечают «келем / келбейм» прямо в приглашении
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
> ✅ Меймандар «келем / келбейм» деп ошол эле жерде жооп беришет
> ✅ Ар бир мейманга жеке шилтеме
>
> Мисал: <ДЕМО ШИЛТЕМЕ>
> Байкап көрүү: toi.night.enkiduck.com

## 2. Instagram / TikTok reel caption

Template-showcase reels are how the KZ services grew.

> Той чакырууну 5 мүнөттө жасаса болот экен 🤯 Кыргызча да, орусча да.
> Карта, тескери саноо, меймандарды эсептөө — баары бар. Шилтеме профилде 👆
> #той #кызузатуу #свадьбабишкек #kyrgyzstan #той2026

## 3. Тамада / decor-studio partners (the compounding channel)

Offer a **20–30% referral cut** to тамада and decor studios who upsell it into every toi
they work. This is the channel that compounds — pitch it directly, not as a listing.

## Notes

- Payments are **not built** yet (free beta). First paid orders can be fulfilled by hand /
  mbank transfer until FreedomPay onboarding is worth it (operator-side).
- Peak toi season is **Aug–Nov** — seeding now (shoulder season) is validation; the volume
  test is the autumn.
- Everything factual here traces to the deep dive:
  `~/.nightshift/reports/playground/20260704-0130-sweep-390b.md` §3.
