import Link from "next/link";
import { whatsappShareUrl } from "@/lib/share";
import { translator } from "@/lib/i18n";
import { getTemplate } from "@/lib/templates";
import { eventInstant, googleCalendarUrl } from "@/lib/calendar";
import {
  displayNames,
  eventLabel,
  formatEventDate,
  toCalendarEvent,
} from "@/lib/invite-view";
import type { InviteDisplay, Locale } from "@/lib/types";
import Countdown from "./Countdown";
import RsvpForm from "./RsvpForm";

/**
 * The invite itself — hero, greeting, countdown, details, RSVP, footer.
 * Shared by the real guest page ("live"), the /demo sample ("demo": RSVP is
 * simulated, footer links to the builder) and the builder's live preview
 * ("preview": nothing interactive, no nested <form>).
 */
export type InviteCardMode = "live" | "demo" | "preview";

export default function InviteCard({
  invite,
  locale,
  mode,
  slug,
  guestName,
  shareBase,
  giftsSlot,
}: {
  invite: InviteDisplay;
  locale: Locale;
  mode: InviteCardMode;
  /** Required in "live" mode (share, .ics, RSVP submits). */
  slug?: string;
  guestName?: string;
  shareBase?: string;
  /** Optional gift-wishlist block, rendered between countdown and RSVP. */
  giftsSlot?: React.ReactNode;
}) {
  const tr = translator(locale);
  const tpl = getTemplate(invite.template);
  const names = displayNames(invite, locale);
  const { start } = eventInstant(invite.event_date, invite.event_time);
  const shareUrl =
    mode === "live" && slug && shareBase
      ? whatsappShareUrl(tr("create.share_text"), `${shareBase}/i/${slug}`)
      : null;

  return (
    <article className="invite__card">
      <div
        className="invite__hero"
        style={{ backgroundImage: `url(${tpl.heroImage})` }}
      >
        <span className="invite__event">{eventLabel(invite, locale)}</span>
        <h1 className="invite__names">
          {invite.partner ? (
            <>
              {invite.honoree}
              <span className="invite__amp">
                {locale === "ky" ? "жана" : "и"}
              </span>
              {invite.partner}
            </>
          ) : (
            invite.honoree
          )}
        </h1>
      </div>

      <div className="invite__body">
        {guestName && (
          <p className="invite__salutation">
            {tr("invite.salutation").replace("{name}", guestName)}
          </p>
        )}
        {invite.greeting && <p className="invite__greeting">{invite.greeting}</p>}

        {/* The facts a guest opens the link for — before any ceremony. */}
        <div className="detail">
          <span className="detail__label">{tr("invite.when")}</span>
          <span className="detail__value">
            {formatEventDate(invite.event_date, locale)}, {invite.event_time}
          </span>
        </div>
        <div className="detail">
          <span className="detail__label">{tr("invite.where")}</span>
          <span className="detail__value">{invite.venue_name}</span>
        </div>

        <div className="actions">
          {invite.venue_map_url &&
            (mode === "preview" ? (
              <span className="btn-ac btn-ac--solid">📍 {tr("invite.open_map")}</span>
            ) : (
              <a
                className="btn-ac btn-ac--solid"
                href={invite.venue_map_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                📍 {tr("invite.open_map")}
              </a>
            ))}
          {mode === "preview" ? (
            <span className="btn-ac">📅 {tr("invite.add_to_calendar")}</span>
          ) : (
            <a
              className="btn-ac"
              href={googleCalendarUrl(toCalendarEvent(invite, locale))}
              target="_blank"
              rel="noopener noreferrer"
            >
              📅 {tr("invite.add_to_calendar")}
            </a>
          )}
          {mode === "live" && slug && (
            <a className="btn-ac" href={`/api/ics/${slug}?lang=${locale}`}>
              ⬇ .ics
            </a>
          )}
        </div>

        {mode !== "preview" && <Countdown targetMs={start.getTime()} locale={locale} />}

        {giftsSlot}

        {mode === "preview" ? (
          <RsvpStub locale={locale} />
        ) : (
          <RsvpForm
            slug={slug ?? ""}
            locale={locale}
            initialName={guestName}
            demo={mode === "demo"}
          />
        )}
      </div>

      <div className="invite__foot">
        {mode === "demo" ? (
          <Link href={`/create?lang=${locale}`}>{tr("demo.foot_cta")}</Link>
        ) : shareUrl ? (
          <a href={shareUrl} target="_blank" rel="noopener noreferrer">
            {tr("invite.share")}
          </a>
        ) : (
          <span>{tr("invite.share")}</span>
        )}
        {" · "}
        {names} · {mode === "preview" ? <span>Той·Invite</span> : <Link href="/">Той·Invite</Link>}
      </div>
    </article>
  );
}

/** Non-interactive RSVP visual for the builder preview (no nested <form>). */
function RsvpStub({ locale }: { locale: Locale }) {
  const tr = translator(locale);
  return (
    <div className="rsvp">
      <span className="invite__event" style={{ display: "block", textAlign: "center" }}>
        {tr("invite.rsvp_kicker")}
      </span>
      <h2>{tr("invite.rsvp_title")}</h2>
      <div className="attend" aria-hidden="true">
        <button type="button" disabled>
          {tr("invite.attend_yes")}
        </button>
        <button type="button" disabled>
          {tr("invite.attend_no")}
        </button>
      </div>
    </div>
  );
}
