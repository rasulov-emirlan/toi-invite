import Link from "next/link";
import { telegramShareUrl, whatsappShareUrl } from "@/lib/share";
import { translator } from "@/lib/i18n";
import { getTemplate } from "@/lib/templates";
import { eventInstant, googleCalendarUrl, rsvpClosed } from "@/lib/calendar";
import {
  displayNames,
  eventLabel,
  formatEventDate,
  greetingFor,
  toCalendarEvent,
} from "@/lib/invite-view";
import { programFromJson } from "@/lib/validation";
import type { InviteDisplay, Locale } from "@/lib/types";
import Countdown from "./Countdown";
import RsvpForm from "./RsvpForm";
import RsvpJump from "./RsvpJump";
import TrackedLink from "./TrackedLink";

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
  invitedGuest,
  shareBase,
  giftsSlot,
}: {
  invite: InviteDisplay;
  locale: Locale;
  mode: InviteCardMode;
  /** Required in "live" mode (share, .ics, RSVP submits). */
  slug?: string;
  guestName?: string;
  /** Personal-link capability (?g=) — links their RSVP to the guest board. */
  invitedGuest?: string;
  shareBase?: string;
  /** Optional gift-wishlist block, rendered between countdown and RSVP. */
  giftsSlot?: React.ReactNode;
}) {
  const tr = translator(locale);
  const tpl = getTemplate(invite.template);
  const names = displayNames(invite, locale);
  const { start } = eventInstant(invite.event_date, invite.event_time);
  const publicUrl = mode === "live" && slug && shareBase ? `${shareBase}/i/${slug}` : null;
  const shareUrl = publicUrl ? whatsappShareUrl(tr("create.share_text"), publicUrl) : null;
  const tgShareUrl = publicUrl ? telegramShareUrl(tr("create.share_text"), publicUrl) : null;
  const createOwnHref = `/create?lang=${locale}${mode === "live" && slug ? `&ref=${slug}` : ""}`;

  const greeting = greetingFor(invite, locale);
  const program = programFromJson(invite.program_json);
  const hostDigits = invite.host_phone ? invite.host_phone.replace(/\D+/g, "") : null;
  // Deadline passed or the toi is over: stop collecting answers (the API
  // enforces the same rule). Preview/demo always show the open form.
  const closed =
    mode === "live" &&
    rsvpClosed(invite.event_date, invite.event_time, invite.rsvp_deadline, Date.now());

  return (
    <article className="invite__card">
      <div
        className="invite__hero"
        style={{ backgroundImage: `url(${tpl.heroImage})` }}
      >
        <span className="invite__event">{eventLabel(invite, locale)}</span>
        {invite.photo_id && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="invite__photo"
            src={`/api/photo/${invite.photo_id}`}
            alt={displayNames(invite, locale)}
            width={148}
            height={148}
          />
        )}
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
        {greeting && <p className="invite__greeting">{greeting}</p>}

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
        {invite.landmark && (
          <div className="detail">
            <span className="detail__label">{tr("invite.landmark")}</span>
            <span className="detail__value">{invite.landmark}</span>
          </div>
        )}
        {invite.dress_code && (
          <div className="detail">
            <span className="detail__label">{tr("invite.dress_code")}</span>
            <span className="detail__value">{invite.dress_code}</span>
          </div>
        )}

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
          {/* One calendar action — the raw «.ics» button was developer jargon
              on a page elders read; the file stays served for power users. */}
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
        </div>

        {hostDigits && (
          <div className="actions">
            {mode === "preview" ? (
              <span className="btn-ac">💬 {tr("invite.host_whatsapp")}</span>
            ) : (
              <a
                className="btn-ac"
                href={`https://wa.me/${hostDigits}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                💬 {tr("invite.host_whatsapp")}
              </a>
            )}
            {mode === "preview" ? (
              <span className="btn-ac">📞 {tr("invite.host_call")}</span>
            ) : (
              <a className="btn-ac" href={`tel:${invite.host_phone}`}>
                📞 {tr("invite.host_call")}
              </a>
            )}
          </div>
        )}

        {program.length > 0 && (
          <div className="program">
            <span className="invite__event" style={{ display: "block", textAlign: "center" }}>
              {tr("invite.program_kicker")}
            </span>
            <ul className="program__list">
              {program.map((item, i) => (
                <li key={i} className="program__item">
                  {item.time && <span className="program__time">{item.time}</span>}
                  <span className="program__title">{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode !== "preview" && <Countdown targetMs={start.getTime()} locale={locale} />}

        {giftsSlot}

        {invite.rsvp_deadline && !closed && (
          <p className="rsvp-deadline">
            {tr("invite.rsvp_deadline").replace(
              "{date}",
              formatEventDate(invite.rsvp_deadline, locale),
            )}
          </p>
        )}

        {mode === "preview" ? (
          <RsvpStub locale={locale} />
        ) : closed ? (
          <div className="rsvp" id="rsvp">
            <p className="rsvp-closed">{tr("invite.rsvp_closed")}</p>
          </div>
        ) : (
          <>
            <RsvpForm
              slug={slug ?? ""}
              locale={locale}
              initialName={guestName}
              invitedGuest={invitedGuest}
              demo={mode === "demo"}
              calendarUrl={googleCalendarUrl(toCalendarEvent(invite, locale))}
              createOwnHref={createOwnHref}
            />
            <RsvpJump label={tr("invite.rsvp_jump")} />
          </>
        )}
      </div>

      <div className="invite__foot">
        {mode === "demo" ? (
          <Link href={`/create?lang=${locale}`}>{tr("demo.foot_cta")}</Link>
        ) : shareUrl && tgShareUrl ? (
          <>
            {tr("invite.share")}:{" "}
            <TrackedLink
              href={shareUrl}
              event="share_click"
              slug={slug}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </TrackedLink>
            {" · "}
            <TrackedLink
              href={tgShareUrl}
              event="share_click"
              slug={slug}
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
            </TrackedLink>
          </>
        ) : (
          <span>{tr("invite.share")}</span>
        )}
        {" · "}
        {names}
        {/* The viral loop: every guest is the next organizer. Preview mode has
            no working links; live/demo invite links back to the builder with
            attribution so guest→create conversion is measurable. */}
        <div className="invite__madewith">
          {mode === "preview" ? (
            <span>{tr("invite.made_with")}</span>
          ) : (
            <TrackedLink
              href={`/create?lang=${locale}${slug ? `&ref=${slug}` : ""}`}
              event="create_own_click"
              slug={slug}
            >
              {tr("invite.made_with")} →
            </TrackedLink>
          )}
        </div>
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
