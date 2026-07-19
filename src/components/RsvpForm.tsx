"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { track } from "@/lib/track";
import { getGuestRef } from "@/lib/guest-ref";
import type { Attendance, Locale } from "@/lib/types";

export default function RsvpForm({
  slug,
  locale,
  initialName = "",
  invitedGuest,
  demo = false,
  calendarUrl,
  createOwnHref,
}: {
  slug: string;
  locale: Locale;
  initialName?: string;
  /** From a personal link — ties the answer to the organizer's guest list. */
  invitedGuest?: string;
  /** Demo mode (the /demo sample): simulate success locally, send nothing. */
  demo?: boolean;
  /** Post-RSVP follow-ups: peak-intent moment right after a guest answers. */
  calendarUrl?: string;
  createOwnHref?: string;
}) {
  const tr = translator(locale);
  const [name, setName] = useState(initialName);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [guests, setGuests] = useState(1);
  const [manyGuests, setManyGuests] = useState(false);
  const [wish, setWish] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [done, setDone] = useState<Attendance | null>(null);

  // Tick down the rate-limit cooldown (keeps the button disabled meanwhile).
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setTimeout(() => setCooldownSec((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldownSec]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!attendance || cooldownSec > 0) return;
    if (demo) {
      setDone(attendance);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          guest_name: name,
          attendance,
          guests_count: attendance === "yes" ? guests : 1,
          wish,
          guest_ref: getGuestRef(),
          invited_guest: invitedGuest ?? null,
        }),
      });
      if (res.status === 429) {
        const raw = Number(res.headers.get("Retry-After"));
        const sec = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 120) : 10;
        setCooldownSec(sec);
        setError(tr("invite.rsvp_rate_limited").replace("{n}", String(sec)));
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError(tr("invite.rsvp_error"));
        setSubmitting(false);
        return;
      }
      setDone(attendance);
    } catch {
      setError(tr("invite.rsvp_error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    // The moment right after answering is peak engagement: hand the coming
    // guest the calendar button, and everyone the create-your-own loop.
    return (
      <div className="rsvp" id="rsvp">
        <div className="thanks" role="status">
          {done === "yes" ? tr("invite.rsvp_thanks_yes") : tr("invite.rsvp_thanks_no")}
        </div>
        <div className="actions" style={{ justifyContent: "center", marginTop: "1rem" }}>
          {done === "yes" && calendarUrl && (
            <a
              className="btn-ac btn-ac--solid"
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("calendar_click", slug || undefined)}
            >
              📅 {tr("invite.add_to_calendar")}
            </a>
          )}
          {createOwnHref && (
            <a
              className="btn-ac"
              href={createOwnHref}
              onClick={() => track("create_own_click", slug || undefined)}
            >
              {tr("invite.after_create_own")}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rsvp" id="rsvp">
      <span className="invite__event" style={{ display: "block", textAlign: "center" }}>
        {tr("invite.rsvp_kicker")}
      </span>
      <h2>{tr("invite.rsvp_title")}</h2>
      <form className="form" onSubmit={submit} style={{ marginTop: 0 }}>
        {/* The choice comes first: it's the easy part for every guest (typing
            is the hard part for elders), and a personal link prefills the name. */}
        <div className="field">
          <label>{tr("invite.rsvp_attendance")}</label>
          <div className="attend" role="group" aria-label={tr("invite.rsvp_attendance")}>
            <button
              type="button"
              aria-pressed={attendance === "yes"}
              onClick={() => setAttendance("yes")}
            >
              {tr("invite.attend_yes")}
            </button>
            <button
              type="button"
              aria-pressed={attendance === "no"}
              onClick={() => setAttendance("no")}
            >
              {tr("invite.attend_no")}
            </button>
          </div>
        </div>

        {attendance === "yes" && (
          <div className="field">
            <label id="g-count-label">{tr("invite.rsvp_guests")}</label>
            {/* Segmented 1–5: Android's number-spinner steppers are tiny; most
                parties are small. «6+» opens the numeric input for big families. */}
            <div className="attend attend--count" role="group" aria-labelledby="g-count-label">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={!manyGuests && guests === n}
                  onClick={() => {
                    setManyGuests(false);
                    setGuests(n);
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={manyGuests}
                onClick={() => {
                  setManyGuests(true);
                  setGuests((g) => Math.max(6, g));
                }}
              >
                6+
              </button>
            </div>
            {manyGuests && (
              <input
                id="g-count"
                type="number"
                inputMode="numeric"
                min={6}
                max={50}
                value={guests}
                aria-labelledby="g-count-label"
                // Floor 6 while «6+» is selected, so the pressed segment and
                // the submitted count can't contradict each other.
                onChange={(e) =>
                  setGuests(Math.max(6, Math.min(50, Number(e.target.value) || 6)))
                }
              />
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="g-name">{tr("invite.rsvp_name")}</label>
          <input
            id="g-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            enterKeyHint="next"
            required
          />
        </div>

        {attendance !== null && (
          <div className="field">
            <label htmlFor="g-wish">{tr("invite.rsvp_wish")}</label>
            <textarea
              id="g-wish"
              value={wish}
              maxLength={300}
              placeholder={tr("invite.rsvp_wish_ph")}
              onChange={(e) => setWish(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-ac btn-ac--solid"
          disabled={
            submitting || cooldownSec > 0 || !attendance || name.trim().length === 0
          }
        >
          {cooldownSec > 0
            ? `${tr("invite.rsvp_submit")} (${cooldownSec})`
            : submitting
              ? tr("invite.rsvp_submitting")
              : tr("invite.rsvp_submit")}
        </button>
        {/* A disabled button that just sits there reads as "broken" — say what's
            missing, right under the guest's thumb. */}
        {!submitting && cooldownSec <= 0 && (
          !attendance ? (
            <p className="rsvp-why">{tr("invite.rsvp_hint_choice")}</p>
          ) : name.trim().length === 0 ? (
            <p className="rsvp-why">{tr("invite.rsvp_hint_name")}</p>
          ) : null
        )}
      </form>
    </div>
  );
}
