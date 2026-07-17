"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { listMyInvites, type MyInvite } from "@/lib/my-invites";
import type { Locale } from "@/lib/types";

/**
 * Invites created in this browser (localStorage) — the recovery path for the
 * organizer link. Renders nothing until mounted and nothing when the list is
 * empty, so first-time visitors never see it.
 */
export default function MyInvites({ locale }: { locale: Locale }) {
  const tr = translator(locale);
  const [invites, setInvites] = useState<MyInvite[] | null>(null);
  useEffect(() => setInvites(listMyInvites()), []);

  if (!invites || invites.length === 0) return null;

  return (
    <section className="section">
      <div className="wrap">
        <span className="kicker kicker--red">{tr("my.kicker")}</span>
        <h2>{tr("my.title")}</h2>
        <ul className="myinvites">
          {invites.map((inv) => (
            <li key={inv.slug}>
              <span className="myinvites__title">{inv.title}</span>
              <span className="myinvites__links">
                <a href={`/i/${inv.slug}`}>{tr("my.open")}</a>
                <a href={`/i/${inv.slug}/rsvps?token=${encodeURIComponent(inv.token)}`}>
                  {tr("my.guests")}
                </a>
                <a href={`/i/${inv.slug}/edit?token=${encodeURIComponent(inv.token)}`}>
                  {tr("my.edit")}
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
