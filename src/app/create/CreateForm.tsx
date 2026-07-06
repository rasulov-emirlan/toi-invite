"use client";

import { useEffect, useMemo, useState } from "react";
import { EVENT_TYPES, getEventType } from "@/lib/events";
import { TEMPLATES } from "@/lib/templates";
import { translator } from "@/lib/i18n";
import type { EventTypeKey, Locale, TemplateKey } from "@/lib/types";

interface Result {
  slug: string;
  token: string;
}

export default function CreateForm({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [eventType, setEventType] = useState<EventTypeKey>("wedding");
  const [template, setTemplate] = useState<TemplateKey>("gold");
  const [honoree, setHonoree] = useState("");
  const [partner, setPartner] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const [venue, setVenue] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [greeting, setGreeting] = useState(
    getEventType("wedding").defaultGreeting[initialLocale],
  );
  const [greetingTouched, setGreetingTouched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const tr = useMemo(() => translator(locale), [locale]);
  const evConfig = getEventType(eventType);

  // Keep the greeting synced to the chosen event/locale until the user edits it.
  useEffect(() => {
    if (!greetingTouched) {
      setGreeting(getEventType(eventType).defaultGreeting[locale]);
    }
  }, [eventType, locale, greetingTouched]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          template,
          locale,
          honoree,
          partner: evConfig.hasPartner ? partner : "",
          event_date: date,
          event_time: time,
          venue_name: venue,
          venue_map_url: mapUrl,
          greeting,
        }),
      });
      if (!res.ok) {
        setError(tr("create.error_generic"));
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as Result;
      setResult(data);
    } catch {
      setError(tr("create.error_generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <SuccessPanel locale={locale} result={result} onReset={resetAll} />;
  }

  function resetAll() {
    setResult(null);
    setHonoree("");
    setPartner("");
    setDate("");
    setVenue("");
    setMapUrl("");
    setGreetingTouched(false);
    setGreeting(getEventType(eventType).defaultGreeting[locale]);
  }

  return (
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
              aria-pressed={locale === l}
              onClick={() => setLocale(l)}
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
              onClick={() => setEventType(ev.key)}
            >
              {ev.labels[locale]}
            </button>
          ))}
        </div>
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
          placeholder={locale === "ky" ? "Азамат" : "Азамат"}
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
          placeholder={locale === "ky" ? "Той-хан «Ала-Тоо»" : "Той-хан «Ала-Тоо»"}
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
                    background: `linear-gradient(135deg, ${tpl.palette.bg}, ${tpl.palette.accentSoft} 60%, ${tpl.palette.accent})`,
                  }}
                />
              </span>
              <span className="tpl-name" style={{ color: tpl.palette.accent }}>
                {tpl.names[locale]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? tr("create.submitting") : tr("create.submit")}
      </button>
    </form>
  );
}

function SuccessPanel({
  locale,
  result,
  onReset,
}: {
  locale: Locale;
  result: Result;
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
        <a className="btn" href={`/i/${result.slug}`}>
          {tr("create.view_invite")} →
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
