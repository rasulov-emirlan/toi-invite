"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { getGuestRef } from "@/lib/guest-ref";
import type { Attendance, Locale } from "@/lib/types";

export default function RsvpForm({
  slug,
  locale,
  initialName = "",
  demo = false,
}: {
  slug: string;
  locale: Locale;
  initialName?: string;
  /** Demo mode (the /demo sample): simulate success locally, send nothing. */
  demo?: boolean;
}) {
  const tr = translator(locale);
  const [name, setName] = useState(initialName);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [guests, setGuests] = useState(1);
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
    return (
      <div className="rsvp">
        <div className="thanks" role="status">
          {done === "yes" ? tr("invite.rsvp_thanks_yes") : tr("invite.rsvp_thanks_no")}
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
        <div className="field">
          <label htmlFor="g-name">{tr("invite.rsvp_name")}</label>
          <input
            id="g-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            required
          />
        </div>

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
            <label htmlFor="g-count">{tr("invite.rsvp_guests")}</label>
            <input
              id="g-count"
              type="number"
              min={1}
              max={50}
              value={guests}
              onChange={(e) => setGuests(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            />
          </div>
        )}

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
      </form>
    </div>
  );
}
