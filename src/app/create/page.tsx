import Link from "next/link";
import { DEFAULT_LOCALE, isLocale, translator } from "@/lib/i18n";
import { logEvent } from "@/lib/db";
import type { Locale } from "@/lib/types";
import CreateForm from "./CreateForm";

export const dynamic = "force-dynamic";

const REF_RE = /^[A-Za-z0-9_-]{1,32}$/;

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; ref?: string }>;
}) {
  const sp = await searchParams;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const tr = translator(locale);
  // Viral-loop attribution: ?ref=<invite slug> arrives from an invite footer.
  const ref = REF_RE.test(sp.ref ?? "") ? sp.ref : undefined;
  logEvent("create_opened", null, ref ?? null);

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <Link href={`/?lang=${locale}`} className="brand">
            Той<b>·</b>Invite
          </Link>
        </div>
      </header>
      <main className="wrap wrap--create">
        <div className="page-head">
          <span className="kicker kicker--red">{tr("create.kicker")}</span>
          <h1>{tr("create.title")}</h1>
          <p style={{ color: "var(--gray-500)", margin: 0 }}>
            {tr("create.subtitle")}
          </p>
        </div>
        <CreateForm initialLocale={locale} createdRef={ref} />
      </main>
      <footer className="footer">
        <div className="wrap">{tr("landing.footer")}</div>
      </footer>
    </>
  );
}
