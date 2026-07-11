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
      "Начните с красивого приглашения. Подключайте список гостей, детали дня и другие инструменты только когда они понадобятся.",
    "landing.eyebrow": "ВАШ ТОЙ · ВАШИ ПРАВИЛА",
    "landing.trust": "Кыргызча жана орусча · без регистрации · бесплатно в бете",
    "landing.preview_event": "ҮЙЛӨНҮҮ ТОЮ",
    "landing.preview_names": "Азамат & Айпери",
    "landing.preview_date": "12 · 09 · 2026",
    "landing.modules_kicker": "РАСТЁТ ВМЕСТЕ С ВАШИМ ТОЕМ",
    "landing.modules_title": "Сначала приглашение. Потом — всё остальное.",
    "landing.modules_body": "Никакого сложного кабинета в первый день. Каждый инструмент подключается отдельно, когда вы готовы.",
    "landing.cta": "Создать приглашение",
    "landing.how_kicker": "КАК ЭТО РАБОТАЕТ",
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
      "Базовое приглашение — бесплатно на время беты. Премиум-шаблоны и персональные приглашения для каждого гостя — скоро.",
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
    "create.optional_title": "Добавить детали",
    "create.optional_body": "Необязательно — включите только то, что полезно вашим гостям.",
    "create.field_dress_code": "Дресс-код",
    "create.field_contact_name": "Контакт для гостей",
    "create.field_contact_phone": "Телефон / WhatsApp",
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

    "invite.when": "Когда",
    "invite.where": "Где",
    "invite.dress_code": "Дресс-код",
    "invite.contact": "Вопросы",
    "invite.open_map": "Открыть в 2GIS",
    "invite.add_to_calendar": "Добавить в календарь",
    "invite.rsvp_kicker": "ВАШ ОТВЕТ",
    "invite.rsvp_title": "Придёте на той?",
    "invite.rsvp_name": "Ваше имя",
    "invite.rsvp_attendance": "Придёте?",
    "invite.attend_yes": "Келем — приду",
    "invite.attend_no": "Келбейм — не смогу",
    "invite.rsvp_guests": "Сколько человек (включая вас)",
    "invite.rsvp_submit": "Отправить ответ",
    "invite.rsvp_submitting": "Отправляем…",
    "invite.rsvp_thanks_yes": "Рахмат! Ждём вас на тое 🎉",
    "invite.rsvp_thanks_no": "Спасибо, что дали знать. Будем скучать!",
    "invite.rsvp_error": "Не удалось отправить. Попробуйте ещё раз.",
    "invite.not_found": "Приглашение не найдено",
    "invite.not_found_body": "Возможно, ссылка неверна или приглашение удалено.",
    "invite.locale_name_ru": "Русский",
    "invite.locale_name_ky": "Кыргызча",
    "invite.cd_days": "дней",
    "invite.cd_hours": "часов",
    "invite.cd_minutes": "минут",
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
    "rsvps.col_when": "Когда ответил",
    "rsvps.status_yes": "Придёт",
    "rsvps.status_no": "Не придёт",
    "rsvps.empty": "Пока никто не ответил. Поделитесь ссылкой с гостями.",
    "rsvps.forbidden": "Доступ закрыт. Нужна ссылка с правильным токеном.",
    "rsvps.back_to_invite": "← К приглашению",
  },
  ky: {
    "brand.name": "Той-Invite",

    "landing.kicker": "ОНЛАЙН ЧАКЫРУУ КАГАЗ",
    "landing.title": "Тойго чакыруу 5 мүнөттө",
    "landing.subtitle":
      "Кооз чакыруудан баштаңыз. Меймандар тизмесин, тойдун маалыматын жана башка куралдарды керектүү учурда гана кошуңуз.",
    "landing.eyebrow": "СИЗДИН ТОЙ · СИЗДИН ЭРЕЖЕ",
    "landing.trust": "Кыргызча жана орусча · каттоосуз · бета учурунда акысыз",
    "landing.preview_event": "ҮЙЛӨНҮҮ ТОЮ",
    "landing.preview_names": "Азамат & Айпери",
    "landing.preview_date": "12 · 09 · 2026",
    "landing.modules_kicker": "ТОЮҢУЗ МЕНЕН БИРГЕ ӨСӨТ",
    "landing.modules_title": "Адегенде чакыруу. Андан кийин — калганы.",
    "landing.modules_body": "Биринчи күнү татаал кабинет жок. Ар бир куралды даяр болгондо өзүнчө кошосуз.",
    "landing.cta": "Чакыруу түзүү",
    "landing.how_kicker": "КАНДАЙ ИШТЕЙТ",
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
      "Негизги чакыруу — бета учурунда акысыз. Премиум үлгүлөр жана ар бир мейманга жеке чакыруу — жакында.",
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
    "create.optional_title": "Кошумча маалымат",
    "create.optional_body": "Милдеттүү эмес — меймандарыңызга керек болгондорун гана кошуңуз.",
    "create.field_dress_code": "Кийим үлгүсү",
    "create.field_contact_name": "Меймандар үчүн байланыш",
    "create.field_contact_phone": "Телефон / WhatsApp",
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

    "invite.when": "Качан",
    "invite.where": "Кайда",
    "invite.dress_code": "Кийим үлгүсү",
    "invite.contact": "Суроолор",
    "invite.open_map": "2GIS'те ачуу",
    "invite.add_to_calendar": "Календарга кошуу",
    "invite.rsvp_kicker": "СИЗДИН ЖООБУҢУЗ",
    "invite.rsvp_title": "Тойго келесизби?",
    "invite.rsvp_name": "Ысымыңыз",
    "invite.rsvp_attendance": "Келесизби?",
    "invite.attend_yes": "Келем",
    "invite.attend_no": "Келбейм",
    "invite.rsvp_guests": "Канча киши (өзүңүздү кошкондо)",
    "invite.rsvp_submit": "Жооп жөнөтүү",
    "invite.rsvp_submitting": "Жөнөтүлүүдө…",
    "invite.rsvp_thanks_yes": "Рахмат! Тойдо күтөбүз 🎉",
    "invite.rsvp_thanks_no": "Билдиргениңизге рахмат. Сагынабыз!",
    "invite.rsvp_error": "Жөнөтүлбөй калды. Кайра аракет кылыңыз.",
    "invite.not_found": "Чакыруу табылган жок",
    "invite.not_found_body": "Балким шилтеме туура эмес же чакыруу өчүрүлгөн.",
    "invite.locale_name_ru": "Русский",
    "invite.locale_name_ky": "Кыргызча",
    "invite.cd_days": "күн",
    "invite.cd_hours": "саат",
    "invite.cd_minutes": "мүнөт",
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
    "rsvps.col_when": "Качан жооп берди",
    "rsvps.status_yes": "Келет",
    "rsvps.status_no": "Келбейт",
    "rsvps.empty": "Азырынча эч ким жооп берген жок. Шилтемени меймандар менен бөлүшүңүз.",
    "rsvps.forbidden": "Кирүү жабык. Туура токени бар шилтеме керек.",
    "rsvps.back_to_invite": "← Чакырууга",
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
