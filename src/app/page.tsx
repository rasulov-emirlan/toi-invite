import Link from "next/link";
import { DEFAULT_LOCALE, isLocale, translator } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export default async function Landing({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const sp = await searchParams;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : DEFAULT_LOCALE;
  const tr = translator(locale);
  const other: Locale = locale === "ru" ? "ky" : "ru";
  const createHref = `/create?lang=${locale}`;

  return (
    <>
      <header className="topbar topbar--warm">
        <div className="topbar__inner">
          <Link href={`/?lang=${locale}`} className="brand">Той<span>·</span>Invite</Link>
          <nav className="nav-actions" aria-label="Primary">
            <Link href={`/?lang=${other}`} className="lang-link">{other === "ky" ? "КЫР" : "РУС"}</Link>
            <Link href={createHref} className="btn btn--small">{tr("landing.cta")}</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero hero--editorial">
          <div className="hero__glow" />
          <div className="wrap hero__grid">
            <div className="hero__copy">
              <span className="kicker">{tr("landing.eyebrow")}</span>
              <h1>{tr("landing.title")}</h1>
              <p>{tr("landing.subtitle")}</p>
              <div className="hero__actions">
                <Link href={createHref} className="btn">{tr("landing.cta")} <span>→</span></Link>
                <small>{tr("landing.trust")}</small>
              </div>
            </div>
            <div className="invite-preview" aria-label="Invitation preview">
              <div className="invite-preview__frame">
                <span className="invite-preview__spark">✦</span>
                <span className="invite-preview__event">{tr("landing.preview_event")}</span>
                <strong>{tr("landing.preview_names")}</strong>
                <span className="invite-preview__date">{tr("landing.preview_date")}</span>
                <span className="invite-preview__line" />
                <p>Ресторан «Ала-Тоо» · Бишкек</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--cream">
          <div className="wrap">
            <div className="section-heading">
              <span className="kicker kicker--gold">{tr("landing.modules_kicker")}</span>
              <h2>{tr("landing.modules_title")}</h2>
              <p>{tr("landing.modules_body")}</p>
            </div>
            <div className="module-grid">
              <article className="module-card module-card--active"><span>01</span><i>✦</i><h3>{locale === "ky" ? "Кооз чакыруу" : "Красивое приглашение"}</h3><p>{locale === "ky" ? "Шилтеме, карта, календарь жана жооптор." : "Ссылка, карта, календарь и ответы гостей."}</p><b>{locale === "ky" ? "Даяр" : "Доступно"}</b></article>
              <article className="module-card"><span>02</span><i>✓</i><h3>{locale === "ky" ? "Меймандар тизмеси" : "Список гостей"}</h3><p>{locale === "ky" ? "Ким келет жана канча адам болорун билиңиз." : "Знайте, кто придёт и сколько будет человек."}</p><b>{locale === "ky" ? "Кааласаңыз" : "По желанию"}</b></article>
              <article className="module-card"><span>03</span><i>◷</i><h3>{locale === "ky" ? "Той планы" : "План дня"}</h3><p>{locale === "ky" ? "Даярдык иштерин жана маанилүү учурларды чогултуңуз." : "Соберите задачи подготовки и важные моменты."}</p><b>{locale === "ky" ? "Жакында" : "Скоро"}</b></article>
              <article className="module-card"><span>04</span><i>₸</i><h3>{locale === "ky" ? "Бюджет жана өнөктөштөр" : "Бюджет и подрядчики"}</h3><p>{locale === "ky" ? "Чыгымдарды көзөмөлдөп, туура адистерди табыңыз." : "Следите за расходами и находите специалистов."}</p><b>{locale === "ky" ? "Жакында" : "Скоро"}</b></article>
            </div>
          </div>
        </section>

        <section className="section process">
          <div className="wrap">
            <span className="kicker kicker--gold">{tr("landing.how_kicker")}</span>
            <div className="process__grid">
              {[["01", tr("landing.step1_title"), tr("landing.step1_body")], ["02", tr("landing.step2_title"), tr("landing.step2_body")], ["03", tr("landing.step3_title"), tr("landing.step3_body")]].map(([n, title, body]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}
            </div>
            <div className="final-cta"><div><span className="kicker">{tr("landing.pricing_kicker")} · 0 СОМ</span><h2>{locale === "ky" ? "Биринчи чакырууңузду бүгүн түзүңүз" : "Создайте первое приглашение сегодня"}</h2></div><Link href={createHref} className="btn btn--light">{tr("landing.cta")} →</Link></div>
          </div>
        </section>
      </main>
      <footer className="footer"><div className="wrap"><span className="brand">Той<span>·</span>Invite</span><span>{tr("landing.footer")}</span></div></footer>
    </>
  );
}
