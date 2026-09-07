/**
 * The product funnel, as one ordered list. Counting raw events tells you how
 * much happened; this converts those counts into the two ratios a decision
 * actually turns on — the drop at each step, and the share of everyone who
 * ever landed. Both are computed over *distinct visitors* (the anonymous sid),
 * not event rows: one organizer reloading the builder ten times is one person.
 *
 * Pure on purpose — the arithmetic is what gets a number wrong, and it is
 * cheaper to unit-test it than to squint at a dashboard.
 */
import type { Locale } from "./types";

export interface FunnelStep {
  /** The event name written by the surface that owns this step. */
  event: string;
  labels: Record<Locale, string>;
  /** Who does this step: the organizer buying, or a guest they invited. */
  actor: "organizer" | "guest";
}

export const FUNNEL: readonly FunnelStep[] = [
  {
    event: "landing_view",
    labels: { ru: "Открыли сайт", ky: "Сайтты ачты" },
    actor: "organizer",
  },
  {
    event: "create_opened",
    labels: { ru: "Начали создавать", ky: "Түзө баштады" },
    actor: "organizer",
  },
  {
    event: "invite_created",
    labels: { ru: "Создали приглашение", ky: "Чакыруу түздү" },
    actor: "organizer",
  },
  {
    event: "share_click",
    labels: { ru: "Поделились ссылкой", ky: "Шилтемени бөлүштү" },
    actor: "organizer",
  },
  {
    event: "invite_view",
    labels: { ru: "Гости открыли", ky: "Меймандар ачты" },
    actor: "guest",
  },
  {
    event: "rsvp_submitted",
    labels: { ru: "Гости ответили", ky: "Меймандар жооп берди" },
    actor: "guest",
  },
  {
    event: "premium_view",
    labels: { ru: "Смотрели тарифы", ky: "Тарифтерди карады" },
    actor: "organizer",
  },
  {
    event: "payment_started",
    labels: { ru: "Начали оплату", ky: "Төлөмдү баштады" },
    actor: "organizer",
  },
  {
    event: "payment_succeeded",
    labels: { ru: "Оплатили", ky: "Төлөдү" },
    actor: "organizer",
  },
] as const;

export const FUNNEL_EVENTS: readonly string[] = FUNNEL.map((s) => s.event);

export interface FunnelRow extends FunnelStep {
  visitors: number;
  /** Share of the previous step, 0–1. Null on the first step. */
  fromPrev: number | null;
  /** Share of the top of the funnel, 0–1. Null when the top is empty. */
  fromTop: number | null;
}

/**
 * Note this is a *step* funnel, not a path funnel: a visitor counted at
 * "rsvp_submitted" need not have been counted at "landing_view" (guests arrive
 * straight on an invite link). So a later step can exceed an earlier one, and
 * a ratio above 1 is information, not a bug — it means that step has its own
 * inbound traffic.
 */
export function computeFunnel(counts: Record<string, number>): FunnelRow[] {
  const top = counts[FUNNEL[0].event] ?? 0;
  let prev: number | null = null;
  return FUNNEL.map((step) => {
    const visitors = counts[step.event] ?? 0;
    const row: FunnelRow = {
      ...step,
      visitors,
      fromPrev: prev === null || prev === 0 ? null : visitors / prev,
      fromTop: top === 0 ? null : visitors / top,
    };
    prev = visitors;
    return row;
  });
}

/**
 * Viral coefficient: new invites each existing invite produces through the
 * "создайте своё" link a guest taps on someone else's card. K ≥ 1 is organic
 * growth; below that every toi still has to be bought from a channel.
 */
export function kFactor(invitesTotal: number, invitesViaRef: number): number | null {
  if (invitesTotal <= 0) return null;
  return invitesViaRef / invitesTotal;
}

/** 0.42 → "42%". Null stays a dash so an empty funnel never reads as 0%. */
export function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(rate < 0.1 ? 1 : 0)}%`;
}
