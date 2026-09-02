import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PHONE_DISPLAY = '(725) 330-5102';
const PHONE_TEL = 'tel:+17253305102';

const STEPS = [
  { n: '01', title: 'You call', body: 'Dial in on a real phone line. No app, no waiting on hold — the AI picks up immediately.' },
  { n: '02', title: 'It interviews you', body: 'A natural voice conversation — name, business, what you need, urgency — the same information a trained intake rep would gather.' },
  { n: '03', title: 'A lead appears', body: 'The moment the call ends, a structured, qualified lead lands in the CRM automatically — no data entry, no follow-up gap.' },
];

const CAPABILITIES = [
  { group: 'Flow Authoring', items: ['AI Script Builder — plain English → working IVR logic', 'Visual Flow Designer (node-based canvas, JSON import/export)', 'Flow Simulator, Auto-Repair & Versioning'] },
  { group: 'Live Operations', items: ['Unified Agent Workspace (Voice, SMS, Web Chat)', 'Lead Management & Activities/Tasks pipeline', 'Customer 360 unified contact intelligence'] },
  { group: 'Intelligence & QA', items: ['Analytics Engine & Transcript Intelligence', 'Quality Assurance & Agent Coaching', 'Intent Taxonomy & Routing Optimizer'] },
  { group: 'Governance & Platform', items: ['Multi-tenant, role-based access control', 'Compliance Automation & Flow Governance', 'Knowledge Vault, Prompt Manager, Integration Hub'] },
];

const BUYERS = [
  'AI SaaS operators looking for a built platform, not a rebuild',
  'Contact-center / CPaaS companies extending their stack',
  'CRM & automation vendors adding a voice layer',
  'MSPs & BPOs who want a done-for-you AI intake product',
  'Operators ready to commercialize under their own brand',
];

const ROADMAP = [
  'Multi-tenant SaaS packaging with self-serve provisioning',
  'Usage metering & subscription billing',
  'Packaged voice-agent products — AI Receptionist, Lead Qualification Agent, After-Hours Agent',
  'White-label & vertical-specific deployments',
];

export default function HomePage() {
  return <>
    <Head>
      <title>AI4 Contact Center — AI-Native Contact Center Platform</title>
      <meta name="description" content="AI4 Intelligent Contact Center: multichannel CRM, Customer 360 and a validated conversational-AI voice layer. Call (725) 330-5102 and talk to the live agent yourself." />
    </Head>
    <Header />
    <main className="page">
      <section className="hero">
        <div className="eyebrow">AI4 INTELLIGENT CONTACT CENTER (AI4CC) · APROPOS GROUP LLC</div>
        <h1>An AI that answers<br/>the phone. <span>For real.</span></h1>
        <p className="lede">
          A developed, production-deployed contact-center platform — 38 application surfaces spanning
          multichannel communications, CRM/Lead workflow, Customer 360 and call-flow governance — with a
          conversational AI voice layer the owner has tested end to end. The contact center stays the system
          of record; the AI enhances the front door, it doesn&apos;t replace the control plane.
        </p>
        <div className="ctaRow">
          <a href={PHONE_TEL} className="callCta">
            <span className="callLabel">Call it right now</span>
            <span className="callNumber">{PHONE_DISPLAY}</span>
          </a>
          <a href="#proof" className="ghostCta">See a real call ↓</a>
          <Link href="/acquisition" className="ghostCta">Buyer walkthrough →</Link>
        </div>
      </section>

      <section className="steps">
        {STEPS.map(s => (
          <div className="step" key={s.n}>
            <span className="stepN">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </section>

      <section id="proof" className="proof">
        <div className="proofHead">
          <small>REAL CALL · OWNER-TESTED END TO END</small>
          <h2>What actually happens on that call</h2>
          <p>Real output from an actual completed call to this number, using placeholder business details for
            demonstration. Every field below was extracted by the AI during the conversation and written
            straight into the platform&apos;s own CRM — not a mockup, not a slide.</p>
        </div>
        <div className="proofCard">
          <div className="proofRow"><span>Caller</span><b>Jordan Reyes</b></div>
          <div className="proofRow"><span>Business</span><b>Acme Fabrication</b></div>
          <div className="proofRow"><span>What they needed</span><b>Metal fabrication shop, 15 employees, six years in business — spreadsheet-based customer intake failing under order volume.</b></div>
          <div className="proofRow"><span>Service interest</span><b>Automated intake / CRM system to track leads and follow up.</b></div>
          <div className="proofRow"><span>Call duration</span><b>1 min 35 sec</b></div>
          <div className="proofRow result"><span>Result</span><b>Lead auto-created · pipeline stage: New</b></div>
        </div>
      </section>

      <section className="capabilities">
        <Title eyebrow="THE PLATFORM" title="More than one feature — a full operating system" />
        <div className="capGrid">
          {CAPABILITIES.map(c => (
            <div className="capCard" key={c.group}>
              <h3>{c.group}</h3>
              <ul>{c.items.map(i => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section className="split">
        <div className="splitCol">
          <Title eyebrow="WHO THIS IS FOR" title="Built to be commercialized, not just admired" />
          <ul className="checkList">{BUYERS.map(b => <li key={b}>{b}</li>)}</ul>
        </div>
        <div className="splitCol">
          <Title eyebrow="ROADMAP" title="Where this goes next" />
          <ul className="checkList roadmap">{ROADMAP.map(r => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>

      <section className="closing">
        <h2>Available for acquisition or white-label partnership</h2>
        <p className="price">$25,000 <span>— asking price, full technology-asset sale</span></p>
        <p>AI4CC is a pre-revenue technology asset — offered on documented development cost and production
          maturity, not a revenue multiple. Full technical diligence, architecture documentation and a guided
          walkthrough are available under NDA.</p>
        <div className="closingCta">
          <Link href="/acquisition" className="callCta small">See the full buyer walkthrough →</Link>
        </div>
      </section>
    </main>
    <Footer />

    <style jsx>{`
      :global(*){box-sizing:border-box}
      :global(body){margin:0;background:#06111f}
      .page{color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);}

      .hero{max-width:1240px;margin:0 auto;padding:88px 24px 56px;}
      .eyebrow{color:#718ba0;font-size:.66rem;font-weight:900;letter-spacing:.16em}
      h1{font-size:clamp(2.6rem,6vw,5rem);line-height:1.02;letter-spacing:-.04em;margin:16px 0 20px;max-width:900px}
      h1 span{color:#69d8ff}
      .lede{color:#9eb3c4;line-height:1.7;font-size:1.05rem;max-width:720px;margin:0 0 34px}

      .ctaRow{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
      .callCta{display:flex;flex-direction:column;gap:2px;text-decoration:none;background:#69d8ff;color:#06111f;padding:16px 26px;border-radius:12px;box-shadow:0 0 0 1px rgba(105,216,255,.4), 0 18px 40px -12px rgba(105,216,255,.45);}
      .callCta.small{padding:13px 22px;flex-direction:row;align-items:center}
      .callLabel{font-size:.66rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;opacity:.75}
      .callNumber{font-size:1.4rem;font-weight:900;letter-spacing:-.01em}
      .ghostCta{color:#c7dbe8;text-decoration:none;font-size:.85rem;font-weight:700;border-bottom:1px solid rgba(255,255,255,.25);padding-bottom:2px}
      .ghostCta:hover{border-color:#69d8ff;color:#69d8ff}

      .steps{max-width:1240px;margin:0 auto;padding:24px 24px 72px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
      .step{border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.72);padding:26px}
      .stepN{color:#3f5b70;font-size:.72rem;font-weight:900;letter-spacing:.14em}
      .step h3{margin:12px 0 8px;font-size:1.15rem;color:#eef8ff}
      .step p{margin:0;color:#8ea2b3;font-size:.86rem;line-height:1.6}

      .proof{max-width:1240px;margin:0 auto;padding:24px 24px 80px}
      .proofHead{max-width:680px;margin-bottom:26px}
      .proofHead small{color:#69d8ff;font-size:.65rem;font-weight:900;letter-spacing:.16em}
      .proofHead h2{margin:10px 0 12px;font-size:2rem;letter-spacing:-.02em}
      .proofHead p{color:#8ea2b3;line-height:1.65;font-size:.9rem;margin:0}
      .proofCard{border:1px solid #19384d;border-radius:16px;background:rgba(7,24,38,.72);padding:8px;max-width:760px}
      .proofRow{display:grid;grid-template-columns:180px 1fr;gap:16px;padding:16px 20px;border-bottom:1px solid #123047}
      .proofRow:last-child{border-bottom:none}
      .proofRow span{color:#718ba0;font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;padding-top:2px}
      .proofRow b{color:#d7e9f4;font-size:.92rem;font-weight:600;line-height:1.55}
      .proofRow.result{background:rgba(105,216,255,.06);border-radius:10px}
      .proofRow.result b{color:#69d8ff;font-weight:800}

      .capabilities{max-width:1240px;margin:0 auto;padding:24px 24px 88px}
      .capGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:28px}
      .capCard{border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.72);padding:22px}
      .capCard h3{margin:0 0 14px;font-size:.95rem;color:#69d8ff;text-transform:uppercase;letter-spacing:.08em}
      .capCard ul{margin:0;padding:0;list-style:none;display:grid;gap:10px}
      .capCard li{color:#a9bcc9;font-size:.82rem;line-height:1.5;padding-left:14px;position:relative}
      .capCard li::before{content:'';position:absolute;left:0;top:.5em;width:5px;height:5px;border-radius:50%;background:#3f5b70}

      .split{max-width:1240px;margin:0 auto;padding:24px 24px 88px;display:grid;grid-template-columns:1fr 1fr;gap:50px}
      .checkList{margin:24px 0 0;padding:0;list-style:none;display:grid;gap:14px}
      .checkList li{color:#c7d7e2;font-size:.92rem;line-height:1.5;padding-left:26px;position:relative}
      .checkList li::before{content:'✓';position:absolute;left:0;color:#5ee6a8;font-weight:900}
      .checkList.roadmap li::before{content:'→';color:#69d8ff}

      .closing{max-width:900px;margin:0 auto;padding:24px 24px 110px;text-align:center}
      .closing h2{font-size:1.7rem;letter-spacing:-.02em;margin:0 0 14px}
      .closing p{color:#8ea2b3;line-height:1.7;font-size:.94rem;margin:0 0 30px}
      .closing p.price{color:#69d8ff;font-size:1.4rem;font-weight:900;letter-spacing:-.01em;margin:0 0 14px}
      .closing p.price span{color:#8ea2b3;font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
      .closingCta{display:flex;justify-content:center}

      @media(max-width:900px){
        .steps{grid-template-columns:1fr}
        .capGrid{grid-template-columns:1fr 1fr}
        .split{grid-template-columns:1fr;gap:36px}
        .proofRow{grid-template-columns:1fr;gap:4px}
      }
      @media(max-width:600px){ .capGrid{grid-template-columns:1fr} }
    `}</style>
  </>;
}

function Title({eyebrow,title}:{eyebrow:string;title:string}){
  return <div className="titleBlock">
    <small>{eyebrow}</small>
    <h2>{title}</h2>
    <style jsx>{`
      .titleBlock small{color:#718ba0;font-size:.65rem;font-weight:900;letter-spacing:.16em}
      .titleBlock h2{margin:10px 0 0;font-size:1.9rem;letter-spacing:-.02em;max-width:700px}
    `}</style>
  </div>;
}
