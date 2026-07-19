import type { Metadata } from "next";
import Link from "next/link";
import { getPaymentByViewToken } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, translator } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import PaymentStatus from "./PaymentStatus";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Оплата · Той-Invite",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Finik redirects the payer here; the webhook usually lands within seconds,
 *  so the page shows the live status and polls while it's still pending. */
export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const tr = translator(locale);
  const pid = UUID_RE.test(sp.pid ?? "") ? (sp.pid as string) : null;
  const payment = pid ? getPaymentByViewToken(pid) : null;

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <Link href={`/?lang=${locale}`} className="brand">
            Той<b>·</b>Invite
          </Link>
        </div>
      </header>
      <main className="wrap wrap--narrow" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
        {!payment || !pid ? (
          <div className="page-head">
            <span className="kicker kicker--red">404</span>
            <h1>{tr("premium.pay_unknown")}</h1>
            <p style={{ marginTop: "2rem" }}>
              <Link href={`/premium?lang=${locale}`} className="btn">
                {tr("premium.back")}
              </Link>
            </p>
          </div>
        ) : (
          <PaymentStatus pid={pid} initialStatus={payment.status} locale={locale} slug={payment.invite_slug ?? undefined} />
        )}
      </main>
    </>
  );
}
