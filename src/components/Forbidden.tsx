import Link from "next/link";

export default function Forbidden({ message, withHomeLink = false }: { message: string; withHomeLink?: boolean }) {
  return (
    <main className="wrap wrap--narrow" style={{ paddingTop: "6rem", textAlign: "center" }}>
      <span className="kicker kicker--red">403</span>
      <h1 style={{ margin: "1rem 0" }}>{message}</h1>
      {withHomeLink && <p style={{ marginTop: "2rem" }}><Link href="/" className="btn">Той·Invite →</Link></p>}
    </main>
  );
}
