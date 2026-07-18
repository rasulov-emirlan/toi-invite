import { getEventType } from "./events";
import type { CalendarEvent } from "./calendar";
import type { InviteDisplay, Locale } from "./types";

const RU_MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

// Modern Kyrgyz uses the same month loanwords; the natural invitation format is
// "12-сентябрь, 2026-жыл".
const KY_MONTHS = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

export function formatEventDate(dateISO: string, locale: Locale): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const mi = m - 1;
  if (mi < 0 || mi > 11) return dateISO;
  if (locale === "ky") return `${d}-${KY_MONTHS[mi]}, ${y}-жыл`;
  return `${d} ${RU_MONTHS_GEN[mi]} ${y}`;
}

export function eventLabel(invite: InviteDisplay, locale: Locale): string {
  return getEventType(invite.event_type).labels[locale];
}

export function displayNames(invite: InviteDisplay, locale: Locale): string {
  if (invite.partner && invite.partner.trim().length > 0) {
    const conj = locale === "ky" ? "жана" : "и";
    return `${invite.honoree} ${conj} ${invite.partner}`;
  }
  return invite.honoree;
}

/** Title used for the browser tab, OG card, and calendar entries. */
export function inviteTitle(invite: InviteDisplay, locale: Locale): string {
  return `${eventLabel(invite, locale)} · ${displayNames(invite, locale)}`;
}

export function ogDescription(invite: InviteDisplay, locale: Locale): string {
  const parts = [formatEventDate(invite.event_date, locale), invite.event_time, invite.venue_name];
  return parts.filter(Boolean).join(" · ");
}

/**
 * Greeting for the viewing locale: the authored per-language text when the
 * organizer wrote it, otherwise the invite's primary greeting — never a blank
 * and never a machine translation.
 */
export function greetingFor(invite: InviteDisplay, locale: Locale): string {
  const specific = locale === "ru" ? invite.greeting_ru : invite.greeting_ky;
  return (specific ?? "").trim() || invite.greeting;
}

export function toCalendarEvent(invite: InviteDisplay, locale: Locale): CalendarEvent {
  return {
    title: inviteTitle(invite, locale),
    details: greetingFor(invite, locale) || eventLabel(invite, locale),
    location: invite.venue_name,
    date: invite.event_date,
    time: invite.event_time,
  };
}
