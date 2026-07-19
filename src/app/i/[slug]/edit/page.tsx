import Link from "next/link";
import Forbidden from "@/components/Forbidden";
import { requireOrganizer } from "@/lib/organizer";
import { isLocale, translator } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import CreateForm from "@/app/create/CreateForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; lang?: string }>;
}) {
  const { slug } = await params;
  const { token, lang } = await searchParams;

  const invite = requireOrganizer(slug, token);
  const locale: Locale = isLocale(lang) ? lang : (invite?.locale ?? "ru");
  const tr = translator(locale);

  if (!invite) return <Forbidden message={tr("rsvps.forbidden")} withHomeLink />;

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <Link href="/" className="brand">
            Той<b>·</b>Invite
          </Link>
          <Link
            href={`/i/${slug}/rsvps?token=${encodeURIComponent(token as string)}`}
            className="kicker"
            style={{ textDecoration: "none" }}
          >
            {tr("edit.back_to_dashboard")}
          </Link>
        </div>
      </header>
      <main className="wrap wrap--create">
        <div className="page-head">
          <span className="kicker kicker--red">{tr("edit.kicker")}</span>
          <h1>{tr("edit.title")}</h1>
          <p style={{ color: "var(--gray-500)", margin: 0 }}>{tr("edit.subtitle")}</p>
        </div>
        <CreateForm
          initialLocale={locale}
          edit={{ slug, token: token as string, initial: invite }}
        />
      </main>
      <footer className="footer">
        <div className="wrap">{tr("landing.footer")}</div>
      </footer>
    </>
  );
}
