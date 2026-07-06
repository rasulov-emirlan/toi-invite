"use client";

import { useState } from "react";
import { translator } from "@/lib/i18n";
import type { Attendance, Locale } from "@/lib/types";

export default function RsvpForm({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const tr = translator(locale);
  const [name, setName] = useState("");
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [guests, setGuests] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Attendance | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!attendance) return;
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
        }),
      });
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
        <div className="thanks">
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

        {error && <div className="alert">{error}</div>}

        <button
          type="submit"
          className="btn-ac btn-ac--solid"
          disabled={submitting || !attendance || name.trim().length === 0}
        >
          {submitting ? tr("invite.rsvp_submitting") : tr("invite.rsvp_submit")}
        </button>
      </form>
    </div>
  );
}
