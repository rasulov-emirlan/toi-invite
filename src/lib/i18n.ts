import type { Locale } from "./types";

export const LOCALES: Locale[] = ["ru", "ky"];
export const DEFAULT_LOCALE: Locale = "ru";

export function isLocale(v: unknown): v is Locale {
  return v === "ru" || v === "ky";
}

/**
 * UI strings for both locales. Kyrgyz is a first-class citizen here — it is the
 * whole differentiation versus the Kazakh players, so the ky column is real
 * Kyrgyz, not a machine gloss. The parity test enforces that every key exists in
 * both columns.
 */
const strings = {
  ru: {
    "brand.name": "Той-Invite",

    "landing.kicker": "ОНЛАЙН-ПРИГЛАСИТЕЛЬНЫЕ",
    "landing.title": "Пригласительный на той за 5 минут",
    "landing.subtitle":
      "Свадьба, кыз узатуу, сүннөт той, юбилей — создайте красивое приглашение со ссылкой, картой и учётом гостей. Кыргызча жана орусча.",
    "landing.cta": "Создать приглашение",
    "landing.demo_cta": "Посмотреть пример",
    "landing.how_kicker": "КАК ЭТО РАБОТАЕТ",
    "landing.how_title": "Три шага — и ссылка готова",
    "landing.features_title": "Сделано для тоя",
    "landing.step1_title": "Заполните детали",
    "landing.step1_body": "Тип тоя, имена, дата, место и пару слов гостям.",
    "landing.step2_title": "Выберите шаблон",
    "landing.step2_body": "Три праздничных дизайна на кыргызском или русском.",
    "landing.step3_title": "Поделитесь ссылкой",
    "landing.step3_body":
      "Отправьте в WhatsApp — приглашение раскроется красиво, а гости ответят «келем/келбейм».",
    "landing.features_kicker": "ПОЧЕМУ МЫ",
    "landing.feature_bilingual": "Кыргызча жана орусча — оба языка полностью",
    "landing.feature_events":
      "Все виды тоя: свадьба, кыз узатуу, сүннөт, бешик, юбилей",
    "landing.feature_rsvp": "Учёт гостей: кто придёт и сколько человек",
    "landing.feature_share": "Ссылка красиво раскрывается в WhatsApp и Telegram",
    "landing.feature_som": "Оплата в сомах — mbank, без карты из-за рубежа",
    "landing.pricing_kicker": "ЦЕНА",
    "landing.pricing_note":
      "Приглашение, именные ссылки и учёт гостей — бесплатно на время беты. Премиум-шаблоны и оформление под заказ — скоро.",
    "landing.footer": "Сделано в Кыргызстане · для тоя",

    "create.kicker": "НОВОЕ ПРИГЛАШЕНИЕ",
    "create.title": "Создайте приглашение",
    "create.subtitle":
      "Заполните детали тоя — через минуту получите ссылку, которой можно делиться.",
    "create.field_event_type": "Тип тоя",
    "create.field_locale": "Язык приглашения",
    "create.locale_hint": "На каком языке будет приглашение для гостей.",
    "create.field_honoree": "Имя (кого чествуем)",
    "create.field_honoree_hint":
      "Для свадьбы — имя жениха или первого лица.",
    "create.field_partner": "Второе имя (необязательно)",
    "create.field_date": "Дата",
    "create.field_time": "Время",
    "create.field_venue": "Место проведения",
    "create.field_map": "Ссылка на 2GIS (необязательно)",
    "create.field_map_hint":
      "Вставьте ссылку на точку в 2GIS — гости откроют карту одним касанием.",
    "create.field_greeting": "Приветствие гостям",
    "create.field_greeting_hint": "Короткое тёплое слово. Можно оставить как есть.",
    "create.field_template": "Шаблон",
    "create.submit": "Создать приглашение",
    "create.submitting": "Создаём…",
    "create.error_generic":
      "Не получилось создать приглашение. Проверьте поля и попробуйте ещё раз.",
    "create.success_title": "Готово! Приглашение создано",
    "create.success_public_label": "Ссылка для гостей",
    "create.success_organizer_label": "Ваша ссылка на список гостей",
    "create.success_organizer_hint":
      "Сохраните эту ссылку — по ней вы видите, кто придёт. Не отправляйте её гостям.",
    "create.copy": "Копировать",
    "create.copied": "Скопировано",
    "create.view_invite": "Открыть приглашение",
    "create.create_another": "Создать ещё одно",
    "create.share_whatsapp": "Поделиться в WhatsApp",
    "create.share_text": "Мы вас приглашаем на той! 🎉",

    "invite.when": "Когда",
    "invite.where": "Где",
    "invite.open_map": "Открыть в 2GIS",
    "invite.add_to_calendar": "Добавить в календарь",
    "invite.share": "Поделиться",
    "invite.rsvp_kicker": "ВАШ ОТВЕТ",
    "invite.rsvp_title": "Придёте на той?",
    "invite.rsvp_name": "Ваше имя",
    "invite.rsvp_attendance": "Придёте?",
    "invite.attend_yes": "Келем — приду",
    "invite.attend_no": "Келбейм — не смогу",
    "invite.rsvp_guests": "Сколько человек (включая вас)",
    "invite.rsvp_wish": "Пожелание (необязательно)",
    "invite.rsvp_wish_ph": "Тёплые слова и каалоо-тилек для виновников торжества…",
    "invite.rsvp_submit": "Отправить ответ",
    "invite.rsvp_submitting": "Отправляем…",
    "invite.rsvp_thanks_yes": "Рахмат! Ждём вас на тое 🎉",
    "invite.rsvp_thanks_no": "Спасибо, что дали знать. Будем скучать!",
    "invite.rsvp_error": "Не удалось отправить. Попробуйте ещё раз.",
    "invite.rsvp_rate_limited": "Слишком много ответов подряд. Подождите {n} с и попробуйте снова.",
    "invite.salutation": "Рады видеть вас, {name}!",
    "invite.not_found": "Приглашение не найдено",
    "invite.not_found_body": "Возможно, ссылка неверна или приглашение удалено.",
    "invite.locale_name_ru": "Русский",
    "invite.locale_name_ky": "Кыргызча",
    "invite.cd_started": "Той идёт! 🎉",

    "rsvps.kicker": "СПИСОК ГОСТЕЙ",
    "rsvps.title": "Кто придёт",
    "rsvps.total_responses": "Ответов",
    "rsvps.coming": "Придут",
    "rsvps.not_coming": "Не придут",
    "rsvps.total_guests": "Всего гостей",
    "rsvps.col_name": "Имя",
    "rsvps.col_status": "Ответ",
    "rsvps.col_guests": "Гостей",
    "rsvps.col_wish": "Пожелание",
    "rsvps.col_when": "Когда ответил",
    "rsvps.status_yes": "Придёт",
    "rsvps.status_no": "Не придёт",
    "rsvps.empty": "Пока никто не ответил. Поделитесь ссылкой с гостями.",
    "rsvps.forbidden": "Доступ закрыт. Нужна ссылка с правильным токеном.",
    "rsvps.back_to_invite": "← К приглашению",
    "rsvps.personal_kicker": "ИМЕННЫЕ ССЫЛКИ",
    "rsvps.personal_title": "Именное приглашение",
    "rsvps.personal_hint":
      "Введите имя гостя — получите ссылку с его именем внутри. Отправьте каждому лично в WhatsApp.",
    "rsvps.personal_name_ph": "Имя гостя",
    "rsvps.download_csv": "Скачать список (CSV)",

    "landing.pricing_cta": "Смотреть тарифы",
    "create.premium_cta": "Хочу премиум ✦",

    "premium.kicker": "ПРЕМИУМ",
    "premium.title": "Премиум для вашего тоя",
    "premium.subtitle":
      "Именные приглашения для каждого гостя, премиум-шаблоны и экспорт для тамады. Оставьте заявку — мы напишем в WhatsApp и подскажем, как оплатить.",
    "premium.price_free": "0 сом",
    "premium.price_suffix": "сом / той",
    "premium.free_badge": "Сейчас бесплатно",
    "premium.popular": "Популярный",
    "premium.order": "Заказать",
    "premium.free_cta": "Создать бесплатно",
    "premium.pay_note":
      "Оплата — перевод на mbank. Реальная активация после подтверждения заявки. Пока идёт бета, базовое приглашение бесплатно.",
    "premium.back": "← На главную",
    "premium.selected_label": "Тариф",
    "premium.form_kicker": "ЗАЯВКА",
    "premium.form_title": "Оставьте заявку",
    "premium.form_name": "Ваше имя",
    "premium.form_phone": "Телефон (WhatsApp)",
    "premium.form_phone_hint": "Напишем вам в WhatsApp, чтобы оформить премиум.",
    "premium.form_comment": "Комментарий (необязательно)",
    "premium.form_comment_ph": "Какой той, когда, сколько гостей…",
    "premium.form_submit": "Отправить заявку",
    "premium.form_submitting": "Отправляем…",
    "premium.form_cancel": "Отмена",
    "premium.form_error":
      "Не удалось отправить. Проверьте телефон и попробуйте ещё раз.",
    "premium.form_rate_limited":
      "Слишком много заявок подряд. Подождите {n} с и попробуйте снова.",
    "premium.success_title": "Заявка принята 🎉",
    "premium.success_body":
      "Спасибо! Мы напишем вам в WhatsApp, чтобы оформить премиум. Оплата — перевод на mbank.",
    "premium.success_again": "Отправить ещё одну заявку",


    "edit.kicker": "РЕДАКТИРОВАНИЕ",
    "edit.title": "Измените приглашение",
    "edit.subtitle": "Ссылка для гостей останется прежней — гости увидят обновлённую версию.",
    "edit.submit": "Сохранить изменения",
    "edit.saved": "Сохранено! Гости уже видят новую версию.",
    "edit.back_to_dashboard": "← К списку гостей",
    "rsvps.copy_guest_link": "Копировать ссылку для гостей",
    "rsvps.edit_invite": "Редактировать",
    "create.success_saved_hint": "Ссылки также сохранены в этом браузере — найдёте их на главной странице.",
    "my.kicker": "МОИ ПРИГЛАШЕНИЯ",
    "my.title": "Созданы в этом браузере",
    "my.open": "Открыть",
    "my.guests": "Список гостей",
    "my.edit": "Редактировать",
    "demo.kicker": "ПРИМЕР ПРИГЛАШЕНИЯ",
    "demo.foot_cta": "Создать своё приглашение",
    "create.preview_kicker": "ПРЕДПРОСМОТР",
    "create.preview_hint": "Так гости увидят ваше приглашение — обновляется по мере заполнения.",
  },
  ky: {
    "brand.name": "Той-Invite",

    "landing.kicker": "ОНЛАЙН ЧАКЫРУУ КАГАЗ",
    "landing.title": "Тойго чакыруу 5 мүнөттө",
    "landing.subtitle":
      "Үйлөнүү тою, кыз узатуу, сүннөт той, юбилей — шилтемеси, картасы жана меймандарды эсептөөсү бар кооз чакыруу түзүңүз. Кыргызча жана орусча.",
    "landing.cta": "Чакыруу түзүү",
    "landing.demo_cta": "Мисалды көрүү",
    "landing.how_kicker": "КАНДАЙ ИШТЕЙТ",
    "landing.how_title": "Үч кадам — шилтеме даяр",
    "landing.features_title": "Той үчүн жасалган",
    "landing.step1_title": "Маалыматты толтуруңуз",
    "landing.step1_body": "Той түрү, ысымдар, күнү, орду жана меймандарга бир нече сөз.",
    "landing.step2_title": "Үлгү тандаңыз",
    "landing.step2_body": "Кыргызча же орусча үч майрамдык дизайн.",
    "landing.step3_title": "Шилтемени бөлүшүңүз",
    "landing.step3_body":
      "WhatsApp'ка жөнөтүңүз — чакыруу кооз ачылат, меймандар «келем/келбейм» деп жооп беришет.",
    "landing.features_kicker": "ЭМНЕ ҮЧҮН БИЗ",
    "landing.feature_bilingual": "Кыргызча жана орусча — эки тил толук",
    "landing.feature_events":
      "Тойдун бардык түрлөрү: үйлөнүү, кыз узатуу, сүннөт, бешик, юбилей",
    "landing.feature_rsvp": "Меймандарды эсептөө: ким келет жана канча киши",
    "landing.feature_share": "Шилтеме WhatsApp жана Telegram'да кооз ачылат",
    "landing.feature_som": "Сом менен төлөм — mbank, чет элдик картасыз",
    "landing.pricing_kicker": "БААСЫ",
    "landing.pricing_note":
      "Чакыруу, аты жазылган шилтемелер жана меймандарды эсептөө — бета учурунда акысыз. Премиум үлгүлөр жана заказ боюнча жасалгалоо — жакында.",
    "landing.footer": "Кыргызстанда жасалган · той үчүн",

    "create.kicker": "ЖАҢЫ ЧАКЫРУУ",
    "create.title": "Чакыруу түзүңүз",
    "create.subtitle":
      "Тойдун маалыматын толтуруңуз — бир мүнөттөн кийин бөлүшө турган шилтеме аласыз.",
    "create.field_event_type": "Той түрү",
    "create.field_locale": "Чакыруунун тили",
    "create.locale_hint": "Чакыруу меймандар үчүн кайсы тилде болот.",
    "create.field_honoree": "Ысым (кимди тойлойбуз)",
    "create.field_honoree_hint":
      "Үйлөнүү тою үчүн — күйөө баланын же биринчи адамдын ысымы.",
    "create.field_partner": "Экинчи ысым (милдеттүү эмес)",
    "create.field_date": "Күнү",
    "create.field_time": "Убакыты",
    "create.field_venue": "Өткөрүлүүчү жер",
    "create.field_map": "2GIS шилтемеси (милдеттүү эмес)",
    "create.field_map_hint":
      "2GIS'теги чекитке шилтеме коюңуз — меймандар картаны бир жолу басып ачышат.",
    "create.field_greeting": "Меймандарга кайрылуу",
    "create.field_greeting_hint": "Кыска жылуу сөз. Ушул бойдон калтырса болот.",
    "create.field_template": "Үлгү",
    "create.submit": "Чакыруу түзүү",
    "create.submitting": "Түзүлүүдө…",
    "create.error_generic":
      "Чакыруу түзүлбөй калды. Талааларды текшерип, кайра аракет кылыңыз.",
    "create.success_title": "Даяр! Чакыруу түзүлдү",
    "create.success_public_label": "Меймандар үчүн шилтеме",
    "create.success_organizer_label": "Меймандардын тизмесине шилтемеңиз",
    "create.success_organizer_hint":
      "Бул шилтемени сактаңыз — аны менен ким келерин көрөсүз. Меймандарга жөнөтпөңүз.",
    "create.copy": "Көчүрүү",
    "create.copied": "Көчүрүлдү",
    "create.view_invite": "Чакырууну ачуу",
    "create.create_another": "Дагы бирди түзүү",
    "create.share_whatsapp": "WhatsApp'та бөлүшүү",
    "create.share_text": "Сиздерди тойго чакырабыз! 🎉",

    "invite.when": "Качан",
    "invite.where": "Кайда",
    "invite.open_map": "2GIS'те ачуу",
    "invite.add_to_calendar": "Календарга кошуу",
    "invite.share": "Бөлүшүү",
    "invite.rsvp_kicker": "СИЗДИН ЖООБУҢУЗ",
    "invite.rsvp_title": "Тойго келесизби?",
    "invite.rsvp_name": "Ысымыңыз",
    "invite.rsvp_attendance": "Келесизби?",
    "invite.attend_yes": "Келем",
    "invite.attend_no": "Келбейм",
    "invite.rsvp_guests": "Канча киши (өзүңүздү кошкондо)",
    "invite.rsvp_wish": "Каалоо-тилек (милдеттүү эмес)",
    "invite.rsvp_wish_ph": "Той ээлерине жылуу сөздөр жана каалоо-тилектер…",
    "invite.rsvp_submit": "Жооп жөнөтүү",
    "invite.rsvp_submitting": "Жөнөтүлүүдө…",
    "invite.rsvp_thanks_yes": "Рахмат! Тойдо күтөбүз 🎉",
    "invite.rsvp_thanks_no": "Билдиргениңизге рахмат. Сагынабыз!",
    "invite.rsvp_error": "Жөнөтүлбөй калды. Кайра аракет кылыңыз.",
    "invite.rsvp_rate_limited": "Удаама-удаа өтө көп жооп. {n} с күтүп, кайра аракет кылыңыз.",
    "invite.salutation": "Урматтуу {name}!",
    "invite.not_found": "Чакыруу табылган жок",
    "invite.not_found_body": "Балким шилтеме туура эмес же чакыруу өчүрүлгөн.",
    "invite.locale_name_ru": "Русский",
    "invite.locale_name_ky": "Кыргызча",
    "invite.cd_started": "Той башталды! 🎉",

    "rsvps.kicker": "МЕЙМАНДАР ТИЗМЕСИ",
    "rsvps.title": "Ким келет",
    "rsvps.total_responses": "Жооптор",
    "rsvps.coming": "Келишет",
    "rsvps.not_coming": "Келишпейт",
    "rsvps.total_guests": "Бардык меймандар",
    "rsvps.col_name": "Ысым",
    "rsvps.col_status": "Жооп",
    "rsvps.col_guests": "Мейман",
    "rsvps.col_wish": "Каалоо-тилек",
    "rsvps.col_when": "Качан жооп берди",
    "rsvps.status_yes": "Келет",
    "rsvps.status_no": "Келбейт",
    "rsvps.empty": "Азырынча эч ким жооп берген жок. Шилтемени меймандар менен бөлүшүңүз.",
    "rsvps.forbidden": "Кирүү жабык. Туура токени бар шилтеме керек.",
    "rsvps.back_to_invite": "← Чакырууга",
    "rsvps.personal_kicker": "ЖЕКЕ ШИЛТЕМЕЛЕР",
    "rsvps.personal_title": "Аты жазылган чакыруу",
    "rsvps.personal_hint":
      "Меймандын атын жазыңыз — ичинде аты бар шилтеме аласыз. Ар бирине WhatsApp'та жеке жөнөтүңүз.",
    "rsvps.personal_name_ph": "Меймандын аты",
    "rsvps.download_csv": "Тизмени жүктөө (CSV)",

    "landing.pricing_cta": "Тарифтерди көрүү",
    "create.premium_cta": "Премиум каалайм ✦",

    "premium.kicker": "ПРЕМИУМ",
    "premium.title": "Тойуңуз үчүн премиум",
    "premium.subtitle":
      "Ар бир мейманга аты жазылган чакыруу, премиум үлгүлөр жана тамада үчүн экспорт. Өтүнүч калтырыңыз — WhatsApp'ка жазып, кантип төлөөнү айтабыз.",
    "premium.price_free": "0 сом",
    "premium.price_suffix": "сом / той",
    "premium.free_badge": "Азыр акысыз",
    "premium.popular": "Популярдуу",
    "premium.order": "Буйрутма берүү",
    "premium.free_cta": "Акысыз түзүү",
    "premium.pay_note":
      "Төлөм — mbank которуу. Чыныгы активация өтүнүч тастыкталгандан кийин. Бета учурунда негизги чакыруу акысыз.",
    "premium.back": "← Башкы бетке",
    "premium.selected_label": "Тариф",
    "premium.form_kicker": "ӨТҮНҮЧ",
    "premium.form_title": "Өтүнүч калтырыңыз",
    "premium.form_name": "Ысымыңыз",
    "premium.form_phone": "Телефон (WhatsApp)",
    "premium.form_phone_hint": "Премиумду тариздөө үчүн WhatsApp'ка жазабыз.",
    "premium.form_comment": "Комментарий (милдеттүү эмес)",
    "premium.form_comment_ph": "Кайсы той, качан, канча мейман…",
    "premium.form_submit": "Өтүнүч жөнөтүү",
    "premium.form_submitting": "Жөнөтүлүүдө…",
    "premium.form_cancel": "Жокко чыгаруу",
    "premium.form_error":
      "Жөнөтүлбөй калды. Телефонду текшерип, кайра аракет кылыңыз.",
    "premium.form_rate_limited":
      "Удаама-удаа өтө көп өтүнүч. {n} с күтүп, кайра аракет кылыңыз.",
    "premium.success_title": "Өтүнүч кабыл алынды 🎉",
    "premium.success_body":
      "Рахмат! Премиумду тариздөө үчүн WhatsApp'ка жазабыз. Төлөм — mbank которуу.",
    "premium.success_again": "Дагы бир өтүнүч жөнөтүү",


    "edit.kicker": "ОҢДОО",
    "edit.title": "Чакырууну өзгөртүңүз",
    "edit.subtitle": "Меймандар үчүн шилтеме ошол бойдон калат — меймандар жаңыланган версияны көрүшөт.",
    "edit.submit": "Өзгөртүүлөрдү сактоо",
    "edit.saved": "Сакталды! Меймандар жаңы версияны көрүп жатышат.",
    "edit.back_to_dashboard": "← Меймандар тизмесине",
    "rsvps.copy_guest_link": "Меймандар шилтемесин көчүрүү",
    "rsvps.edit_invite": "Оңдоо",
    "create.success_saved_hint": "Шилтемелер бул браузерде да сакталды — аларды башкы беттен табасыз.",
    "my.kicker": "МЕНИН ЧАКЫРУУЛАРЫМ",
    "my.title": "Бул браузерде түзүлгөн",
    "my.open": "Ачуу",
    "my.guests": "Меймандар тизмеси",
    "my.edit": "Оңдоо",
    "demo.kicker": "ЧАКЫРУУНУН МИСАЛЫ",
    "demo.foot_cta": "Өз чакырууңузду түзүү",
    "create.preview_kicker": "АЛДЫН АЛА КӨРҮҮ",
    "create.preview_hint": "Меймандар чакырууну ушундай көрүшөт — толтурган сайын жаңырат.",
  },
} as const;

export type StringKey = keyof (typeof strings)["ru"];

export const STRINGS = strings;

export function t(locale: Locale, key: StringKey): string {
  return strings[locale][key];
}

/** Bound translator for a locale — `const tr = translator(locale); tr("...")`. */
export function translator(locale: Locale): (key: StringKey) => string {
  return (key: StringKey) => strings[locale][key];
}
