import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type Lead = { id: string; title: string; service_interest: string | null; pipeline_stage: string; priority: string; updated_at: string };

const STAGE_TONE: Record<string, string> = {
  new: '#69d8ff', qualified: '#69d8ff', contacted: '#ffd166', follow_up: '#ffd166',
  opportunity: '#5ee6a8', converted: '#5ee6a8', lost: '#ff7f8f', nurture: '#91a8bc',
};

export default function LiveLeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/leads')
      .then(r => r.json())
      .then(d => setLeads(d.leads ?? []))
      .catch(() => setError('Could not load live leads.'));
  }, []);

  return <>
    <Head>
      <title>Live Lead Management — AI4 Contact Center</title>
      <meta name="description" content="A real, live view of AI4 Contact Center's Lead Management pipeline — see exactly what the platform captures from a real call." />
      <meta name="robots" content="noindex" />
    </Head>
    <Header />
    <main className="page">
      <section className="intro">
        <Link href="/demo" className="back">← Back to the demo</Link>
        <div className="eyebrow">LIVE · LEAD MANAGEMENT</div>
        <h1>The real pipeline, right now.</h1>
        <p>This is a live, read-only mirror of AI4CC&apos;s actual Lead Management data. Call the demo line and
          your lead will appear here within moments.</p>
      </section>
      <section className="list">
        {error && <div className="empty">{error}</div>}
        {!error && leads === null && <div className="empty">Loading…</div>}
        {leads && leads.length === 0 && <div className="empty">No leads yet — be the first to call.</div>}
        {leads && leads.map(l => (
          <div className="row" key={l.id}>
            <div>
              <b>{l.title}</b>
              {l.service_interest && <p>{l.service_interest}</p>}
            </div>
            <span className="stage" style={{ color: STAGE_TONE[l.pipeline_stage] ?? '#91a8bc' }}>{l.pipeline_stage.replace(/_/g, ' ').toUpperCase()}</span>
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
      :global(.back){display:inline-flex;align-items:center;min-height:44px;padding:11px 16px;border:1px solid rgba(105,216,255,.65);border-radius:10px;background:rgba(105,216,255,.08);color:#69d8ff!important;text-decoration:none!important;font-size:.78rem;font-weight:900;letter-spacing:.03em;box-shadow:0 8px 24px rgba(0,0,0,.16);transition:background .15s,border-color .15s,transform .15s}
      :global(.back:hover){background:rgba(105,216,255,.16);border-color:#69d8ff;transform:translateY(-1px)}
      .eyebrow{color:#718ba0;font-size:.65rem;font-weight:900;letter-spacing:.16em;margin-top:22px}
      h1{font-size:clamp(1.9rem,4vw,2.6rem);letter-spacing:-.03em;margin:14px 0 14px}
      .intro p{color:#9eb3c4;line-height:1.7;font-size:.96rem;max-width:620px;margin:0}
      .list{max-width:900px;margin:0 auto;padding:10px 24px 100px;border:1px solid #19384d;border-radius:16px;overflow:hidden}
      .row{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 22px;border-bottom:1px solid #123047}
      .row:last-child{border-bottom:none}
      .row b{font-size:.94rem;color:#eef8ff}
      .row p{margin:6px 0 0;color:#8ea2b3;font-size:.8rem;max-width:520px}
      .stage{font-size:.65rem;font-weight:900;letter-spacing:.08em;white-space:nowrap}
      .empty{padding:26px 22px;color:#7891a3;font-size:.88rem}
    `}</style>
  </>;
}
