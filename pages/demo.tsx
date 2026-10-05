import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
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
  const [looking, setLooking] = useState(false);
  const [last4, setLast4] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Only the caller's own call is shown: the lookup needs the last 4 digits of the number they called from.
  const findMyCall = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(last4)) return;
    setLooking(true);
    try {
      const r = await fetch(`/api/public/latest-call?last4=${last4}`);
      const d = r.ok ? await r.json() : { call: null };
      setCall(d?.call ?? null);
    } catch {
      setCall(null);
    } finally {
      setChecked(true);
      setLooking(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <>
    
    <Header />
    <main className="page">
      <section className="intro">
        <div className="eyebrow">LIVE DEMO</div>
        <h1>Don&apos;t take our word for it. Call it.</h1>
        <p>This is a real, production system — not a sandbox, not a recording. Three steps, no signup.</p>
        <button type="button" className="guideButton" onClick={() => setDrawerOpen(true)}>Open demo guide →</button>
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
          <p>Play the role of a business owner or decision-maker shopping for a Contact Center, CRM or Lead Management solution. Ask what you would genuinely want to know and let the conversation develop naturally.</p>
        </div>
        <div className="step">
          <span>03</span>
          <h2>Watch it become a lead</h2>
          <p>The moment you hang up, a structured lead exists in the CRM. Enter the last 4 digits of your phone below to see it — no data entry, nobody typing notes after the call.</p>
        </div>
      </section>

      <section className="result">
        <div className="resultHead">
          <small>{checked && call ? 'LIVE · YOUR CALL' : 'FIND YOUR CALL'}</small>
          <h2>{checked && call ? 'Here\'s what your call produced' : checked ? 'No matching call yet' : 'See the lead your call created'}</h2>
          <p>{checked && !call
            ? 'We couldn\'t find a completed call from the last hour ending in those digits. If you just hung up, give it a few seconds and check again.'
            : 'For privacy, only your own call is shown. Enter the last 4 digits of the phone you called from.'}</p>
        </div>
        <form className="lookup" onSubmit={findMyCall}>
          <label htmlFor="last4">Last 4 digits of your phone</label>
          <div className="lookupRow">
            <input id="last4" inputMode="numeric" autoComplete="off" pattern="\d{4}" maxLength={4} placeholder="1234"
              value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            <button type="submit" disabled={looking || last4.length !== 4}>{looking ? 'Checking…' : checked ? 'Check again' : 'Show my call'}</button>
          </div>
        </form>
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
        {checked && call && (
          <div className="getStarted">
            <p>Like what you just experienced?</p>
            <Link href="/intake" className="getStartedCta">Get Started →</Link>
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

    <div className={`drawerBackdrop ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} aria-hidden={!drawerOpen} />
    <aside className={`demoDrawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen} aria-label="Live demo instructions">
      <div className="drawerHead">
        <div>
          <small>LIVE DEMO</small>
          <h2>How to experience the AI</h2>
        </div>
        <button type="button" className="closeButton" aria-label="Close demo guide" onClick={() => setDrawerOpen(false)}>×</button>
      </div>

      <div className="drawerBody">
        <p className="role"><strong>The Conversational Agent is currently programmed to serve as a representative of the Operation Center's sales team.</strong></p>

        <p>For this demonstration, play the role of a business owner or decision-maker who is shopping for a <strong>Contact Center, CRM or Lead Management solution.</strong></p>

        <p>Call the Agent and have a normal conversation. Ask whatever questions you would genuinely ask if you were evaluating this type of solution for your company.</p>

        <div className="naturalCallout">
          <strong>There is no required script.</strong>
          <span>Speak naturally, ask follow-up questions, change direction, challenge an answer, or call more than once using a different business scenario. The purpose of the demonstration is to experience how dynamically the AI Conversational Agent responds.</span>
        </div>

        <a href={PHONE_TEL} className="drawerCallCta">
          <span>CALL THE LIVE AGENT</span>
          <b>{PHONE_DISPLAY}</b>
        </a>

        <div className="afterCall">
          <small>AFTER YOUR CALL</small>
          <p>Close this guide and watch the Operation Center convert the conversation into a structured Lead in the live CRM.</p>
        </div>
      </div>
    </aside>

    <Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}
      :global(body){margin:0;background:#06111f}
      .page{color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);}
      .intro{max-width:900px;margin:0 auto;padding:70px 24px 40px}
      .eyebrow{color:#718ba0;font-size:.65rem;font-weight:900;letter-spacing:.16em}
      h1{font-size:clamp(2rem,4.4vw,3rem);letter-spacing:-.03em;margin:14px 0 14px}
      .intro p{color:#9eb3c4;line-height:1.7;font-size:1rem;max-width:600px;margin:0}
      .guideButton{margin-top:18px;border:1px solid rgba(105,216,255,.55);border-radius:9px;background:rgba(105,216,255,.08);color:#69d8ff;padding:10px 14px;font-size:.72rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase;cursor:pointer}
      .guideButton:hover{background:rgba(105,216,255,.14)}

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
      .resultHead p{margin:10px 0 0;color:#9eb3c4;font-size:.9rem;line-height:1.6}
      .lookup{display:grid;gap:8px;margin:0 0 20px}
      .lookup label{color:#718ba0;font-size:.66rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
      .lookupRow{display:flex;gap:10px;flex-wrap:wrap}
      .lookup input{width:120px;border:1px solid #29495d;border-radius:9px;background:rgba(7,24,38,.72);color:#eef8ff;padding:11px 14px;font-size:1.05rem;letter-spacing:.2em}
      .lookup input:focus{outline:none;border-color:#69d8ff}
      .lookup button{border:none;border-radius:9px;background:#69d8ff;color:#06111f;padding:11px 18px;font-size:.78rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
      .lookup button:disabled{opacity:.5;cursor:default}
      .proofCard{border:1px solid #19384d;border-radius:16px;background:rgba(7,24,38,.72);padding:8px}
      .proofRow{display:grid;grid-template-columns:160px 1fr;gap:16px;padding:15px 20px;border-bottom:1px solid #123047}
      .proofRow:last-child{border-bottom:none}
      .proofRow span{color:#718ba0;font-size:.66rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
      .proofRow b{color:#d7e9f4;font-size:.9rem;font-weight:600}
      .proofRow.result{background:rgba(105,216,255,.06);border-radius:10px}
      .proofRow.result b{color:#69d8ff;font-weight:800}
      .getStarted{margin-top:22px;border:1px solid rgba(105,216,255,.35);border-radius:16px;background:rgba(105,216,255,.07);padding:22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
      .getStarted p{margin:0;color:#d7e9f4;font-size:1rem;font-weight:700}
      :global(.getStartedCta){flex:0 0 auto;text-decoration:none;background:#69d8ff;color:#06111f;padding:13px 20px;border-radius:10px;font-size:.8rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
      :global(.getStartedCta:hover){filter:brightness(1.06)}

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

      .drawerBackdrop{position:fixed;inset:0;background:rgba(2,8,15,.62);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .22s ease;z-index:90}
      .drawerBackdrop.open{opacity:1;pointer-events:auto}
      .demoDrawer{position:fixed;top:0;right:0;width:min(520px,92vw);height:100vh;background:linear-gradient(180deg,#071827,#06111f);border-left:1px solid #244a61;box-shadow:-24px 0 80px rgba(0,0,0,.45);transform:translateX(104%);transition:transform .26s ease;z-index:100;color:#eef8ff;display:flex;flex-direction:column}
      .demoDrawer.open{transform:translateX(0)}
      .drawerHead{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:26px 26px 20px;border-bottom:1px solid #16364b}
      .drawerHead small{display:block;color:#69d8ff;font-size:.62rem;font-weight:900;letter-spacing:.16em;margin-bottom:7px}
      .drawerHead h2{margin:0;font-size:1.35rem;letter-spacing:-.02em}
      .closeButton{border:1px solid #29495d;background:rgba(255,255,255,.03);color:#d7e9f4;border-radius:9px;width:38px;height:38px;font-size:1.45rem;line-height:1;cursor:pointer}
      .closeButton:hover{border-color:#69d8ff;color:#69d8ff}
      .drawerBody{padding:24px 26px 34px;overflow-y:auto}
      .drawerBody p{color:#a9bcc9;font-size:.92rem;line-height:1.7;margin:0 0 18px}
      .drawerBody .role{color:#d9edf8}
      .drawerBody strong{color:#eef8ff}
      .naturalCallout{border:1px solid rgba(105,216,255,.35);background:rgba(105,216,255,.07);border-radius:14px;padding:18px;margin:22px 0;display:grid;gap:9px}
      .naturalCallout strong{color:#69d8ff;font-size:.92rem}
      .naturalCallout span{color:#c1d4df;font-size:.86rem;line-height:1.65}
      .drawerCallCta{display:flex;flex-direction:column;gap:4px;text-decoration:none;background:#69d8ff;color:#06111f;border-radius:12px;padding:16px 20px;margin:24px 0;box-shadow:0 16px 36px -20px rgba(105,216,255,.75)}
      .drawerCallCta span{font-size:.62rem;font-weight:900;letter-spacing:.14em}
      .drawerCallCta b{font-size:1.45rem;letter-spacing:-.01em}
      .afterCall{border-top:1px solid #16364b;padding-top:20px}
      .afterCall small{color:#69d8ff;font-size:.62rem;font-weight:900;letter-spacing:.14em}
      .afterCall p{margin:8px 0 0;color:#c0d2de}

      @media(max-width:800px){ .steps{grid-template-columns:1fr} .docGrid{grid-template-columns:1fr} }
      @media(max-width:520px){
        .demoDrawer{width:100vw}
        .drawerHead,.drawerBody{padding-left:20px;padding-right:20px}
        .guideButton{width:100%}
      }
    `}</style>
  </>;
}

