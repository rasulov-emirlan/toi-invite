import Link from "next/link";
import { DEFAULT_LOCALE, isLocale, translator } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import CreateForm from "./CreateForm";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const tr = translator(locale);

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <Link href={`/?lang=${locale}`} className="brand">
            Той<b>·</b>Invite
          </Link>
        </div>
      </header>
      <main className="wrap wrap--narrow">
        <div className="page-head">
          <span className="kicker kicker--red">{tr("create.kicker")}</span>
          <h1>{tr("create.title")}</h1>
          <p style={{ color: "var(--gray-500)", margin: 0 }}>
            {tr("create.subtitle")}
          </p>
        </div>
        <CreateForm initialLocale={locale} />
      </main>
      <footer className="footer">
        <div className="wrap">{tr("landing.footer")}</div>
      </footer>
    </>
  );
}
