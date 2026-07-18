"use client";

import { useEffect, useState } from "react";
import { translator } from "@/lib/i18n";
import { listMyInvites, type MyInvite } from "@/lib/my-invites";
import type { Locale } from "@/lib/types";

/**
 * Invites created in this browser — the recovery path for the organizer link.
 * Two sources, merged: the server list (HttpOnly organizer cookie — survives a
 * wiped localStorage) and the local list (works when cookies are blocked).
 * Renders nothing until mounted and nothing when both are empty.
 */
export default function MyInvites({
  locale,
  serverInvites = [],
}: {
  locale: Locale;
  serverInvites?: MyInvite[];
}) {
  const tr = translator(locale);
  const [invites, setInvites] = useState<MyInvite[] | null>(null);
  useEffect(() => {
    const local = listMyInvites();
    const seen = new Set(serverInvites.map((i) => i.slug));
    setInvites([...serverInvites, ...local.filter((i) => !seen.has(i.slug))]);
    // serverInvites comes from the server render and never changes client-side.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
