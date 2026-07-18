"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EVENT_TYPES, getEventType } from "@/lib/events";
import { TEMPLATES, getTemplate, paletteVars } from "@/lib/templates";
import { translator } from "@/lib/i18n";
import { whatsappShareUrl } from "@/lib/share";
import { normalizeMapUrl, programFromJson, LIMITS } from "@/lib/validation";
import { displayNames, eventLabel } from "@/lib/invite-view";
import { rememberInvite } from "@/lib/my-invites";
import type {
  EventTypeKey,
  InviteDisplay,
  Locale,
  ProgramItem,
  TemplateKey,
} from "@/lib/types";
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
  createdRef,
}: {
  initialLocale: Locale;
  edit?: EditTarget;
  /** Viral-loop attribution (?ref= on /create) — measured, never required. */
  createdRef?: string;
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

  // Bilingual greeting: one textarea with a RU/KY tab. Each language keeps the
  // event-type default until the organizer touches it; both are sent, so a
  // guest switching the invite language sees a real greeting, not a machine mix.
  const [greetingTab, setGreetingTab] = useState<Locale>(
    edit ? edit.initial.locale : initialLocale,
  );
  const [greetingRu, setGreetingRu] = useState(
    edit
      ? (edit.initial.greeting_ru ??
          (edit.initial.locale === "ru" ? edit.initial.greeting : ""))
      : getEventType("wedding").defaultGreeting.ru,
  );
  const [greetingKy, setGreetingKy] = useState(
    edit
      ? (edit.initial.greeting_ky ??
          (edit.initial.locale === "ky" ? edit.initial.greeting : ""))
      : getEventType("wedding").defaultGreeting.ky,
  );
  const [greetingTouched, setGreetingTouched] = useState<Record<Locale, boolean>>({
    ru: Boolean(edit),
    ky: Boolean(edit),
  });

  // Optional extras.
  const [hostPhone, setHostPhone] = useState(edit ? (edit.initial.host_phone ?? "") : "");
  const [landmark, setLandmark] = useState(edit ? (edit.initial.landmark ?? "") : "");
  const [dressCode, setDressCode] = useState(edit ? (edit.initial.dress_code ?? "") : "");
  const [deadline, setDeadline] = useState(edit ? (edit.initial.rsvp_deadline ?? "") : "");
  const [program, setProgram] = useState<ProgramItem[]>(
    edit ? programFromJson(edit.initial.program_json) : [],
  );
  const [photoId, setPhotoId] = useState<string | null>(
    edit ? (edit.initial.photo_id ?? null) : null,
  );
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const [showExtras, setShowExtras] = useState(
    Boolean(
      edit &&
        (edit.initial.host_phone ||
          edit.initial.landmark ||
          edit.initial.dress_code ||
          edit.initial.rsvp_deadline ||
          programFromJson(edit.initial.program_json).length > 0),
    ),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  const tr = useMemo(() => translator(uiLocale), [uiLocale]);
  const evConfig = getEventType(eventType);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Keep each language's greeting synced to the chosen event until it's edited.
  useEffect(() => {
    const defaults = getEventType(eventType).defaultGreeting;
    setGreetingRu((cur) => (greetingTouched.ru ? cur : defaults.ru));
    setGreetingKy((cur) => (greetingTouched.ky ? cur : defaults.ky));
  }, [eventType, greetingTouched]);

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
      venue_map_url: normalizeMapUrl(mapUrl),
      greeting: inviteLocale === "ru" ? greetingRu : greetingKy,
      greeting_ru: greetingRu,
      greeting_ky: greetingKy,
      host_phone: hostPhone,
      landmark,
      dress_code: dressCode,
      rsvp_deadline: deadline,
      program,
      photo_id: photoId ?? "",
      created_ref: createdRef ?? "",
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

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    setPhotoError(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/photo", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = (await res.json()) as { id: string };
      setPhotoId(data.id);
    } catch {
      setPhotoError(true);
    } finally {
      setPhotoBusy(false);
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
      greeting: (inviteLocale === "ru" ? greetingRu : greetingKy).trim(),
      greeting_ru: greetingRu.trim() || null,
      greeting_ky: greetingKy.trim() || null,
      host_phone: hostPhone.trim() || null,
      landmark: landmark.trim() || null,
      rsvp_deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null,
      dress_code: dressCode.trim() || null,
      program_json:
        program.filter((p) => p.title.trim()).length > 0
          ? JSON.stringify(program.filter((p) => p.title.trim()))
          : null,
      photo_id: photoId,
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
    setTime("17:00");
    setVenue("");
    setMapUrl("");
    setHostPhone("");
    setLandmark("");
    setDressCode("");
    setDeadline("");
    setProgram([]);
    setPhotoId(null);
    setGreetingTouched({ ru: false, ky: false });
    const defaults = getEventType(eventType).defaultGreeting;
    setGreetingRu(defaults.ru);
    setGreetingKy(defaults.ky);
  }

  const greetingValue = greetingTab === "ru" ? greetingRu : greetingKy;

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
                onClick={() => {
                  setInviteLocale(l);
                  setGreetingTab(l);
                }}
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
            type="text"
            inputMode="url"
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            onBlur={(e) => setMapUrl(normalizeMapUrl(e.target.value))}
            maxLength={500}
            placeholder="https://2gis.kg/bishkek/..."
          />
          <p className="hint">{tr("create.field_map_hint")}</p>
        </div>

        {/* photo */}
        <div className="field">
          <label htmlFor="photo">{tr("create.field_photo")}</label>
          {photoId ? (
            <div className="photo-picked">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photo/${photoId}`} alt="" />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setPhotoId(null);
                  if (photoInput.current) photoInput.current.value = "";
                }}
              >
                {tr("create.photo_remove")}
              </button>
            </div>
          ) : (
            <input
              id="photo"
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={photoBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPhoto(f);
              }}
            />
          )}
          {photoBusy && <p className="hint">{tr("create.photo_uploading")}</p>}
          {photoError && (
            <div className="alert" role="alert">
              {tr("create.photo_error")}
            </div>
          )}
          {!photoId && !photoBusy && !photoError && (
            <p className="hint">{tr("create.photo_hint")}</p>
          )}
        </div>

        {/* greeting — bilingual tabs */}
        <div className="field">
          <label htmlFor="greeting">{tr("create.field_greeting")}</label>
          <div className="choices" role="group" aria-label={tr("create.field_greeting")}>
            {(["ru", "ky"] as Locale[]).map((l) => (
              <button
                type="button"
                key={l}
                className="choice"
                aria-pressed={greetingTab === l}
                onClick={() => setGreetingTab(l)}
              >
                {l === "ru" ? "Русский" : "Кыргызча"}
              </button>
            ))}
          </div>
          <textarea
            id="greeting"
            value={greetingValue}
            maxLength={600}
            onChange={(e) => {
              const v = e.target.value;
              if (greetingTab === "ru") setGreetingRu(v);
              else setGreetingKy(v);
              setGreetingTouched((t) => ({ ...t, [greetingTab]: true }));
            }}
          />
          <p className="hint">{tr("create.greeting_langs_hint")}</p>
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

        {/* optional extras: contact, landmark, dress code, deadline, programme */}
        <div className="field">
          <button
            type="button"
            className="btn btn--ghost"
            aria-expanded={showExtras}
            onClick={() => setShowExtras((v) => !v)}
          >
            {showExtras ? "−" : "+"} {tr("create.more_toggle")}
          </button>
        </div>

        {showExtras && (
          <>
            <div className="field">
              <label htmlFor="host-phone">{tr("create.field_host_phone")}</label>
              <input
                id="host-phone"
                type="tel"
                value={hostPhone}
                onChange={(e) => setHostPhone(e.target.value)}
                maxLength={20}
                placeholder="0555 123 456"
              />
              <p className="hint">{tr("create.field_host_phone_hint")}</p>
            </div>

            <div className="field">
              <label htmlFor="landmark">{tr("create.field_landmark")}</label>
              <input
                id="landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                maxLength={160}
                placeholder={tr("create.field_landmark_ph")}
              />
            </div>

            <div className="row2">
              <div className="field">
                <label htmlFor="dress">{tr("create.field_dress_code")}</label>
                <input
                  id="dress"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  maxLength={120}
                  placeholder={tr("create.field_dress_code_ph")}
                />
              </div>
              <div className="field">
                <label htmlFor="deadline">{tr("create.field_deadline")}</label>
                <input
                  id="deadline"
                  type="date"
                  value={deadline}
                  min={edit ? undefined : today}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>{tr("create.field_program")}</label>
              {program.map((item, i) => (
                <div className="progrow" key={i}>
                  <input
                    type="time"
                    value={item.time}
                    onChange={(e) =>
                      setProgram((p) =>
                        p.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)),
                      )
                    }
                  />
                  <input
                    value={item.title}
                    maxLength={80}
                    placeholder={tr("create.program_title_ph")}
                    onChange={(e) =>
                      setProgram((p) =>
                        p.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="copybtn"
                    aria-label="−"
                    onClick={() => setProgram((p) => p.filter((_, j) => j !== i))}
                  >
                    −
                  </button>
                </div>
              ))}
              {program.length < LIMITS.programItems && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() =>
                    setProgram((p) => [...p, { time: "", title: "" }])
                  }
                >
                  {tr("create.program_add")}
                </button>
              )}
            </div>
          </>
        )}

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
