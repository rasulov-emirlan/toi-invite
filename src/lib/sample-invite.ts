import { getEventType } from "./events";
import type { InviteDisplay, Locale } from "./types";

/**
 * The showcase wedding used by /demo and the landing hero — always ~6 weeks
 * out so the countdown looks alive.
 */
export function sampleInvite(locale: Locale): InviteDisplay {
  const d = new Date();
  d.setDate(d.getDate() + 45);
  const iso = d.toISOString().slice(0, 10);
  const deadline = new Date(d);
  deadline.setDate(deadline.getDate() - 7);
  return {
    slug: "demo",
    event_type: "wedding",
    template: "ornament_gold",
    locale,
    honoree: "Азамат",
    partner: "Айпери",
    event_date: iso,
    event_time: "17:00",
    venue_name: "Той-хан «Ала-Тоо», Бишкек",
    venue_map_url: "https://2gis.kg/bishkek",
    greeting: getEventType("wedding").defaultGreeting[locale],
    greeting_ru: getEventType("wedding").defaultGreeting.ru,
    greeting_ky: getEventType("wedding").defaultGreeting.ky,
    host_phone: "+996555123456",
    landmark:
      locale === "ky"
        ? "Филармониянын жанында, чыгыш кире бериши"
        : "Рядом с филармонией, восточный вход",
    rsvp_deadline: deadline.toISOString().slice(0, 10),
    dress_code: locale === "ky" ? "Салтанаттуу кийим" : "Нарядная одежда",
    program_json: JSON.stringify(
      locale === "ky"
        ? [
            { time: "17:00", title: "Меймандарды тосуу" },
            { time: "18:00", title: "Салтанаттуу бөлүк" },
            { time: "19:30", title: "Бий жана концерт" },
          ]
        : [
            { time: "17:00", title: "Встреча гостей" },
            { time: "18:00", title: "Торжественная часть" },
            { time: "19:30", title: "Танцы и концерт" },
          ],
    ),
    photo_id: null,
  };
}
