import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type Contact = { id: string; display_name: string; company_name: string | null; preferred_channel: string | null; lead_score: number | null; updated_at: string };

export default function LiveContactsPage() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/contacts')
      .then(r => r.json())
      .then(d => setContacts(d.contacts ?? []))
      .catch(() => setError('Could not load live contacts.'));
  }, []);

  return <>
    <Head>
      <title>Live Customer 360 — AI4 Contact Center</title>
      <meta name="description" content="A real, live view of AI4 Contact Center's Customer 360 contact intelligence — see exactly what the platform builds from a real call." />
      <meta name="robots" content="noindex" />
    </Head>
    <Header />
    <main className="page">
      <section className="intro">
        <Link href="/demo" className="back">← Back to the demo</Link>
        <div className="eyebrow">LIVE · CUSTOMER 360</div>
        <h1>Every caller, unified.</h1>
        <p>A live, read-only mirror of AI4CC&apos;s Customer 360 contact list. Call the demo line and you&apos;ll
          show up here as a new contact, unified with your lead automatically.</p>
      </section>
      <section className="list">
        {error && <div className="empty">{error}</div>}
        {!error && contacts === null && <div className="empty">Loading…</div>}
        {contacts && contacts.length === 0 && <div className="empty">No contacts yet — be the first to call.</div>}
        {contacts && contacts.map(c => (
          <div className="row" key={c.id}>
            <div>
              <b>{c.display_name}</b>
              {c.company_name && <p>{c.company_name}</p>}
            </div>
            <div className="meta">
              {c.preferred_channel && <span>{c.preferred_channel.toUpperCase()}</span>}
              {c.lead_score != null && <span className="score">Score {c.lead_score}</span>}
            </div>
          </div>
        ))}
      </section>
    </main>
    <Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}
      :global(body){margin:0;background:#06111f}
      .page{color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);}
      .intro{max-width:900px;margin:0 auto;padding:60px 24px 30px}
      .back{color:#69d8ff;text-decoration:none;font-size:.78rem;font-weight:800}
      .eyebrow{color:#718ba0;font-size:.65rem;font-weight:900;letter-spacing:.16em;margin-top:22px}
      h1{font-size:clamp(1.9rem,4vw,2.6rem);letter-spacing:-.03em;margin:14px 0 14px}
      .intro p{color:#9eb3c4;line-height:1.7;font-size:.96rem;max-width:620px;margin:0}
      .list{max-width:900px;margin:0 auto;padding:10px 24px 100px;border:1px solid #19384d;border-radius:16px;overflow:hidden}
      .row{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 22px;border-bottom:1px solid #123047}
      .row:last-child{border-bottom:none}
      .row b{font-size:.94rem;color:#eef8ff}
      .row p{margin:6px 0 0;color:#8ea2b3;font-size:.8rem}
      .meta{display:flex;gap:14px;align-items:center;white-space:nowrap}
      .meta span{font-size:.65rem;font-weight:900;letter-spacing:.08em;color:#718ba0}
      .meta .score{color:#69d8ff}
      .empty{padding:26px 22px;color:#7891a3;font-size:.88rem}
    `}</style>
  </>;
}
