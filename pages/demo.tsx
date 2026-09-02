import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PHONE_DISPLAY = '(725) 330-5102';
const PHONE_TEL = 'tel:+17253305102';

type LiveCall = {
  callerName: string | null; businessName: string | null; phone: string | null;
  description: string | null; serviceInterest: string | null; duration: string | null;
  leadStage: string | null; capturedAt: string;
};

const DOC_PAGES = [
  { href: '/live/leads', title: 'Live Lead Management', body: 'The real pipeline your call just landed in — pipeline stage, priority, what you told the agent.' },
  { href: '/live/contacts', title: 'Live Customer 360', body: 'The unified contact record the platform built from your call automatically.' },
];

export default function DemoPage() {
  const [call, setCall] = useState<LiveCall | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/latest-call')
      .then(r => r.ok ? r.json() : { call: null })
      .then(d => { if (!cancelled) setCall(d?.call ?? null); })
      .finally(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, []);

  return <>
    <Head>
      <title>Live Demo — AI4 Contact Center</title>
      <meta name="description" content="Call (725) 330-5102, talk to the AI4 Contact Center Conversational AI Agent, then watch the call become a real lead in the live CRM." />
    </Head>
    <Header />
    <main className="page">
      <section className="intro">
        <div className="eyebrow">LIVE DEMO</div>
        <h1>Don&apos;t take our word for it. Call it.</h1>
        <p>This is a real, production system — not a sandbox, not a recording. Three steps, no signup.</p>
      </section>

      <section className="steps">
        <div className="step">
          <span>01</span>
          <h2>Call the number</h2>
          <a href={PHONE_TEL} className="callCta">
            <span className="callLabel">Tap to call</span>
            <span className="callNumber">{PHONE_DISPLAY}</span>
          </a>
        </div>
        <div className="step">
          <span>02</span>
          <h2>Have a real conversation</h2>
          <p>Tell it about a business — real or made up. Name, what it does, what it needs. The AI runs a natural
            intake interview, the same way a trained rep would.</p>
        </div>
        <div className="step">
          <span>03</span>
          <h2>Watch it become a lead</h2>
          <p>The moment you hang up, a structured lead exists in the CRM below — no data entry, nobody typing
            notes after the call.</p>
        </div>
      </section>

      <section className="result">
        <div className="resultHead">
          <small>{checked && call ? 'LIVE · MOST RECENT CALL' : 'WAITING FOR A CALL'}</small>
          <h2>{checked && call ? 'Here\'s what your call (or the last one) produced' : 'No call captured yet — be the first'}</h2>
        </div>
        {checked && call && (
          <div className="proofCard">
            <div className="proofRow"><span>Caller</span><b>{call.callerName ?? '—'}</b></div>
            <div className="proofRow"><span>Number</span><b>{call.phone ?? '—'}</b></div>
            {call.businessName && <div className="proofRow"><span>Business</span><b>{call.businessName}</b></div>}
            {call.description && <div className="proofRow"><span>What they needed</span><b>{call.description}</b></div>}
            {call.duration && <div className="proofRow"><span>Duration</span><b>{call.duration}</b></div>}
            <div className="proofRow result"><span>Result</span><b>Lead created{call.leadStage ? ` · stage: ${call.leadStage}` : ''}</b></div>
          </div>
        )}
      </section>

      <section className="docPages">
        <h2>See it inside the real platform</h2>
        <div className="docGrid">
          {DOC_PAGES.map(p => (
            <Link href={p.href} className="docCard" key={p.href}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span>Open live view →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="closing">
        <Link href="/acquisition" className="ghostCta">← Back to the buyer walkthrough</Link>
      </section>
    </main>
    <Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}
      :global(body){margin:0;background:#06111f}
      .page{color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);}
      .intro{max-width:900px;margin:0 auto;padding:70px 24px 40px}
      .eyebrow{color:#718ba0;font-size:.65rem;font-weight:900;letter-spacing:.16em}
      h1{font-size:clamp(2rem,4.4vw,3rem);letter-spacing:-.03em;margin:14px 0 14px}
      .intro p{color:#9eb3c4;line-height:1.7;font-size:1rem;max-width:600px;margin:0}

      .steps{max-width:1100px;margin:0 auto;padding:10px 24px 70px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
      .step{border:1px solid #19384d;border-radius:16px;background:rgba(7,24,38,.72);padding:26px}
      .step span{color:#3f5b70;font-size:.7rem;font-weight:900;letter-spacing:.14em}
      .step h2{margin:10px 0 14px;font-size:1.1rem}
      .step p{margin:0;color:#a9bcc9;font-size:.86rem;line-height:1.6}
      .callCta{display:flex;flex-direction:column;gap:2px;text-decoration:none;background:#69d8ff;color:#06111f;padding:13px 18px;border-radius:10px;width:fit-content}
      .callLabel{font-size:.6rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;opacity:.75}
      .callNumber{font-size:1.15rem;font-weight:900}

      .result{max-width:900px;margin:0 auto;padding:10px 24px 70px}
      .resultHead{margin-bottom:20px}
      .resultHead small{color:#69d8ff;font-size:.65rem;font-weight:900;letter-spacing:.16em}
      .resultHead h2{margin:10px 0 0;font-size:1.5rem;letter-spacing:-.02em}
      .proofCard{border:1px solid #19384d;border-radius:16px;background:rgba(7,24,38,.72);padding:8px}
      .proofRow{display:grid;grid-template-columns:160px 1fr;gap:16px;padding:15px 20px;border-bottom:1px solid #123047}
      .proofRow:last-child{border-bottom:none}
      .proofRow span{color:#718ba0;font-size:.66rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
      .proofRow b{color:#d7e9f4;font-size:.9rem;font-weight:600}
      .proofRow.result{background:rgba(105,216,255,.06);border-radius:10px}
      .proofRow.result b{color:#69d8ff;font-weight:800}

      .docPages{max-width:900px;margin:0 auto;padding:10px 24px 70px}
      .docPages h2{font-size:1.4rem;margin:0 0 20px;letter-spacing:-.02em}
      .docGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      :global(.docCard){display:block;border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.72);padding:24px;text-decoration:none;transition:border-color .15s}
      :global(.docCard:hover){border-color:#69d8ff}
      :global(.docCard h3){margin:0 0 10px;font-size:1.02rem;color:#eef8ff}
      :global(.docCard p){margin:0 0 14px;color:#a9bcc9;font-size:.85rem;line-height:1.55}
      :global(.docCard span){color:#69d8ff;font-size:.78rem;font-weight:800}

      .closing{max-width:900px;margin:0 auto;padding:10px 24px 100px}
      .ghostCta{color:#c7dbe8;text-decoration:none;font-size:.85rem;font-weight:700}
      .ghostCta:hover{color:#69d8ff}

      @media(max-width:800px){ .steps{grid-template-columns:1fr} .docGrid{grid-template-columns:1fr} }
    `}</style>
  </>;
}
