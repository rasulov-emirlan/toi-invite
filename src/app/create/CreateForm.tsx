"use client";

import { useEffect, useMemo, useState } from "react";
import { EVENT_TYPES, getEventType } from "@/lib/events";
import { TEMPLATES, getTemplate, paletteVars } from "@/lib/templates";
import { translator } from "@/lib/i18n";
import { whatsappShareUrl } from "@/lib/share";
import { displayNames, eventLabel } from "@/lib/invite-view";
import { rememberInvite } from "@/lib/my-invites";
import type { EventTypeKey, InviteDisplay, Locale, TemplateKey } from "@/lib/types";
import InviteCard from "@/components/InviteCard";

interface Result {
  slug: string;
  token: string;
}

/** Present in edit mode: the invite being edited plus its organizer token. */
export interface EditTarget {
  slug: string;
  token: string;
  initial: InviteDisplay;
}

export default function CreateForm({
  initialLocale,
  edit,
}: {
  initialLocale: Locale;
  edit?: EditTarget;
}) {
  // The builder UI stays in the visitor's language; `inviteLocale` is only the
  // language the guests will see. Choosing a Kyrgyz invite must not flip the
  // whole form under a Russian-speaking organizer (and vice versa).
  const uiLocale = initialLocale;
  const [inviteLocale, setInviteLocale] = useState<Locale>(
    edit ? edit.initial.locale : initialLocale,
  );
  const [eventType, setEventType] = useState<EventTypeKey>(
    edit ? edit.initial.event_type : "wedding",
  );
  const [template, setTemplate] = useState<TemplateKey>(
    edit ? edit.initial.template : "gold",
  );
  const [honoree, setHonoree] = useState(edit ? edit.initial.honoree : "");
  const [partner, setPartner] = useState(edit ? (edit.initial.partner ?? "") : "");
  const [date, setDate] = useState(edit ? edit.initial.event_date : "");
  const [time, setTime] = useState(edit ? edit.initial.event_time : "17:00");
  const [venue, setVenue] = useState(edit ? edit.initial.venue_name : "");
  const [mapUrl, setMapUrl] = useState(edit ? (edit.initial.venue_map_url ?? "") : "");
  const [greeting, setGreeting] = useState(
    edit ? edit.initial.greeting : getEventType("wedding").defaultGreeting[initialLocale],
  );
  // An existing greeting is the organizer's text — never overwrite it.
  const [greetingTouched, setGreetingTouched] = useState(Boolean(edit));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  const tr = useMemo(() => translator(uiLocale), [uiLocale]);
  const evConfig = getEventType(eventType);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Keep the greeting synced to the chosen event/language until the user edits it.
  useEffect(() => {
    if (!greetingTouched) {
      setGreeting(getEventType(eventType).defaultGreeting[inviteLocale]);
    }
  }, [eventType, inviteLocale, greetingTouched]);

  function payload() {
    return {
      event_type: eventType,
      template,
      locale: inviteLocale,
      honoree,
      partner: evConfig.hasPartner ? partner : "",
      event_date: date,
      event_time: time,
      venue_name: venue,
      venue_map_url: mapUrl,
      greeting,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = edit
        ? await fetch(`/api/invites/${edit.slug}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: edit.token, ...payload() }),
          })
        : await fetch("/api/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload()),
          });
      if (!res.ok) {
        setError(tr("create.error_generic"));
        setSubmitting(false);
        return;
      }
      const inv = previewInvite();
      const title = `${eventLabel(inv, uiLocale)} · ${displayNames(inv, uiLocale)}`;
      if (edit) {
        // Refresh (or adopt, when editing from another browser) the local entry.
        rememberInvite({
          slug: edit.slug,
          token: edit.token,
          title,
          createdAt: new Date().toISOString(),
        });
        setSaved(true);
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as Result;
      const stored = rememberInvite({
        slug: data.slug,
        token: data.token,
        title,
        createdAt: new Date().toISOString(),
      });
      setSavedLocally(stored);
      setResult(data);
    } catch {
      setError(tr("create.error_generic"));
    } finally {
      setSubmitting(false);
    }
  }

  function previewInvite(): InviteDisplay {
    return {
      slug: edit?.slug ?? "preview",
      event_type: eventType,
      template,
      locale: inviteLocale,
      honoree: honoree.trim() || "Азамат",
      partner: evConfig.hasPartner ? partner.trim() || "Айпери" : null,
      event_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today,
      event_time: time || "17:00",
      venue_name: venue.trim() || "Той-хан «Ала-Тоо»",
      venue_map_url: mapUrl.trim() || null,
      greeting: greeting.trim(),
    };
  }

  if (result) {
    return (
      <SuccessPanel
        locale={uiLocale}
        result={result}
        savedLocally={savedLocally}
        onReset={resetAll}
      />
    );
  }

  function resetAll() {
    setResult(null);
    setHonoree("");
    setPartner("");
    setDate("");
    setVenue("");
    setMapUrl("");
    setGreetingTouched(false);
    setGreeting(getEventType(eventType).defaultGreeting[inviteLocale]);
  }

  return (
    <div className="create-grid">
      <form className="form" onSubmit={submit}>
        {/* language of the invite */}
        <div className="field">
          <label>{tr("create.field_locale")}</label>
          <div className="choices" role="group" aria-label={tr("create.field_locale")}>
            {(["ru", "ky"] as Locale[]).map((l) => (
              <button
                type="button"
                key={l}
                className="choice"
                aria-pressed={inviteLocale === l}
                onClick={() => setInviteLocale(l)}
              >
                {l === "ru" ? "Русский" : "Кыргызча"}
              </button>
            ))}
          </div>
          <p className="hint">{tr("create.locale_hint")}</p>
        </div>

        {/* event type */}
        <div className="field">
          <label>{tr("create.field_event_type")}</label>
          <div className="choices" role="group" aria-label={tr("create.field_event_type")}>
            {EVENT_TYPES.map((ev) => (
              <button
                type="button"
                key={ev.key}
                className="choice"
                aria-pressed={eventType === ev.key}
                title={ev.hints[uiLocale]}
                onClick={() => setEventType(ev.key)}
              >
                {ev.labels[uiLocale]}
              </button>
            ))}
          </div>
          <p className="hint">{evConfig.hints[uiLocale]}</p>
        </div>

        {/* honoree + partner */}
        <div className="field">
          <label htmlFor="honoree">{tr("create.field_honoree")}</label>
          <input
            id="honoree"
            value={honoree}
            onChange={(e) => setHonoree(e.target.value)}
            maxLength={80}
            required
            placeholder="Азамат"
          />
          <p className="hint">{tr("create.field_honoree_hint")}</p>
        </div>

        {evConfig.hasPartner && (
          <div className="field">
            <label htmlFor="partner">{tr("create.field_partner")}</label>
            <input
              id="partner"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              maxLength={80}
              placeholder="Айпери"
            />
          </div>
        )}

        {/* date + time */}
        <div className="row2">
          <div className="field">
            <label htmlFor="date">{tr("create.field_date")}</label>
            <input
              id="date"
              type="date"
              value={date}
              // Only creation is future-only: an existing past-dated invite must
              // stay editable (venue/greeting fixes) without a date-range trap.
              min={edit ? undefined : today}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="time">{tr("create.field_time")}</label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* venue + map */}
        <div className="field">
          <label htmlFor="venue">{tr("create.field_venue")}</label>
          <input
            id="venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            maxLength={160}
            required
            placeholder="Той-хан «Ала-Тоо»"
          />
        </div>

        <div className="field">
          <label htmlFor="map">{tr("create.field_map")}</label>
          <input
            id="map"
            type="url"
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            maxLength={500}
            placeholder="https://2gis.kg/bishkek/..."
          />
          <p className="hint">{tr("create.field_map_hint")}</p>
        </div>

        {/* greeting */}
        <div className="field">
          <label htmlFor="greeting">{tr("create.field_greeting")}</label>
          <textarea
            id="greeting"
            value={greeting}
            maxLength={600}
            onChange={(e) => {
              setGreeting(e.target.value);
              setGreetingTouched(true);
            }}
          />
          <p className="hint">{tr("create.field_greeting_hint")}</p>
        </div>

        {/* template */}
        <div className="field">
          <label>{tr("create.field_template")}</label>
          <div className="tpl-choices" role="group" aria-label={tr("create.field_template")}>
            {TEMPLATES.map((tpl) => (
              <button
                type="button"
                key={tpl.key}
                className="tpl-choice"
                aria-pressed={template === tpl.key}
                onClick={() => setTemplate(tpl.key)}
              >
                <span className="swatch">
                  <span
                    style={{
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0)), url(${tpl.heroImage})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                </span>
                <span className="tpl-name" style={{ color: tpl.palette.accent }}>
                  {tpl.names[uiLocale]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="saved-note" role="status">
            {tr("edit.saved")}{" "}
            <a href={`/i/${edit!.slug}`}>{tr("create.view_invite")} →</a>
          </div>
        )}

        <button type="submit" className="btn" disabled={submitting}>
          {submitting
            ? tr("create.submitting")
            : edit
              ? tr("edit.submit")
              : tr("create.submit")}
        </button>
      </form>

      <LivePreview uiLocale={uiLocale} invite={previewInvite()} />
    </div>
  );
}

/** The invite exactly as guests will see it, updating as the form is filled. */
function LivePreview({ uiLocale, invite }: { uiLocale: Locale; invite: InviteDisplay }) {
  const tr = translator(uiLocale);
  const tpl = getTemplate(invite.template);
  return (
    <aside className="create-preview">
      <span className="kicker kicker--red">{tr("create.preview_kicker")}</span>
      <p className="hint">{tr("create.preview_hint")}</p>
      <div
        className="invite invite--embed"
        lang={invite.locale}
        style={paletteVars(tpl) as React.CSSProperties}
      >
        <InviteCard invite={invite} locale={invite.locale} mode="preview" />
      </div>
    </aside>
  );
}

function SuccessPanel({
  locale,
  result,
  savedLocally,
  onReset,
}: {
  locale: Locale;
  result: Result;
  savedLocally: boolean;
  onReset: () => void;
}) {
  const tr = translator(locale);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const publicUrl = `${origin}/i/${result.slug}`;
  const organizerUrl = `${origin}/i/${result.slug}/rsvps?token=${result.token}`;

  return (
    <div className="success" style={{ marginTop: "2rem" }}>
      <div>
        <span className="kicker kicker--red">✓</span>
        <h2 style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>
          {tr("create.success_title")}
        </h2>
        {savedLocally && (
          <p className="hint" style={{ marginTop: "0.5rem" }}>
            {tr("create.success_saved_hint")}
          </p>
        )}
      </div>

      <CopyLink label={tr("create.success_public_label")} value={publicUrl} locale={locale} />

      <div>
        <CopyLink
          label={tr("create.success_organizer_label")}
          value={organizerUrl}
          locale={locale}
        />
        <p className="hint" style={{ marginTop: "0.5rem" }}>
          {tr("create.success_organizer_hint")}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <a
          className="btn"
          href={whatsappShareUrl(tr("create.share_text"), publicUrl)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr("create.share_whatsapp")}
        </a>
        <a className="btn btn--ghost" href={`/i/${result.slug}`}>
          {tr("create.view_invite")} →
        </a>
        <a className="btn btn--ghost" href={`/premium?lang=${locale}`}>
          {tr("create.premium_cta")}
        </a>
        <button type="button" className="btn btn--ghost" onClick={onReset}>
          {tr("create.create_another")}
        </button>
      </div>
    </div>
  );
}

function CopyLink({
  label,
  value,
  locale,
}: {
  label: string;
  value: string;
  locale: Locale;
}) {
  const tr = translator(locale);
  const [copied, setCopied] = useState(false);
  return (
    <div className="linkbox">
      <label>{label}</label>
      <div className="linkrow">
        <input readOnly value={value} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="copybtn"
          aria-live="polite"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked — the field is selectable as a fallback */
            }
          }}
        >
          {copied ? tr("create.copied") : tr("create.copy")}
        </button>
      </div>
    </div>
  );
}
