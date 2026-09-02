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

const PLATFORM_PAGES = [
  { href: '/platform/flow-authoring', eyebrow: 'FLOW AUTHORING', title: 'Build call logic without writing code', body: 'AI Script Builder, a node-based Visual Flow Designer, simulation, auto-repair and full version history.' },
  { href: '/platform/live-operations', eyebrow: 'LIVE OPERATIONS', title: 'Where calls become customers', body: 'A unified Agent Workspace, Lead Management, Activities/Tasks and Customer 360 — the commercial engine.' },
  { href: '/platform/intelligence-qa', eyebrow: 'INTELLIGENCE & QA', title: 'Know what happened on every call', body: 'Analytics, transcript intelligence, quality scoring, agent coaching, intent taxonomy and routing optimization.' },
  { href: '/platform/governance-platform', eyebrow: 'GOVERNANCE & PLATFORM', title: 'Built for more than one business', body: 'Multi-tenant RBAC, compliance automation, flow governance, and the shared platform services underneath it all.' },
];

const BUYERS = [
  'AI SaaS operators looking for a built platform, not a rebuild',
  'Contact-center / CPaaS companies extending their stack',
  'CRM & automation vendors adding a voice layer',
  'MSPs & BPOs who want a done-for-you AI intake product',
  'Operators ready to commercialize under their own brand',
];

const COMPARE_ROWS = [
  { label: 'Pricing model', values: ['$75–$240 / user / mo', '$65–$95 / agent / mo', '$119–$230+ / seat / mo (50-seat min)', '$71–$209 / agent / mo'], ai4cc: '$25,000 one-time, own it outright' },
  { label: 'Implementation cost', values: ['Not published', 'Not published', '$50K–$500K+ (enterprise)', '$50K–$500K+ (enterprise)'], ai4cc: '$0 — included' },
  { label: 'Voice, SMS & chat routing', values: ['✓', '✓', '✓', '✓'], ai4cc: '✓' },
  { label: 'Conversational AI intake', values: ['Add-on', 'Add-on', 'Add-on, higher tiers only', 'Add-on, +$30–60/agent/mo'], ai4cc: 'Built in, proven live' },
  { label: 'CRM / Lead workflow', values: ['Third-party integration', 'Third-party integration', 'Third-party integration', 'Third-party integration'], ai4cc: 'Native, included' },
  { label: 'Per-minute voice charges', values: ['$0.009–$0.015/min', 'Varies by plan', 'Varies by plan', 'Varies by plan'], ai4cc: 'Buyer-controlled provider usage costs' },
  { label: 'Ongoing vendor lock-in', values: ['Yes', 'Yes', 'Yes', 'Yes'], ai4cc: 'No AI4CC platform lock-in — source transfers' },
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
        <h1>State of the Art AI<br/>Intelligent Conversational Agent. <span>24 Hour Coverage</span></h1>
        <div className="whatHow">
          <div>
            <small>WHAT IT DOES</small>
            <p>Answers real inbound calls, runs a natural intake conversation, and turns every call into a
              structured, qualified lead in a live CRM — automatically, with no agent typing notes afterward.</p>
          </div>
          <div>
            <small>HOW IT'S DONE</small>
            <p>38 application surfaces — flow authoring, omnichannel routing, Lead Management, Customer 360,
              QA and governance — built as one platform with a conversational AI voice layer on top. The
              contact center stays the system of record; the AI enhances the front door, it doesn&apos;t
              replace the control plane.</p>
          </div>
        </div>
        <div className="ctaRow">
          <a href={PHONE_TEL} className="callCta">
            <span className="callLabel">Call the AI now</span>
            <span className="callNumber">{PHONE_DISPLAY}</span>
          </a>
          <Link href="/demo" className="buyerCta">Watch the live demo →</Link>
          <Link href="/acquisition" className="buyerCta secondary">Buyer walkthrough →</Link>
        </div>
      </section>

      <section className="compare">
        <Title eyebrow="VS. THE MAJORS" title="The core capabilities — without the perpetual seat fee" />
        <div className="compareScroll">
          <div className="compareTable">
            <div className="compareRow compareHead">
              <span></span><span>Genesys Cloud CX</span><span>RingCentral RingCX</span><span>Five9</span><span>NICE CXone</span><span className="hi">AI4CC</span>
            </div>
            {COMPARE_ROWS.map(row => (
              <div className="compareRow" key={row.label}>
                <span>{row.label}</span>
                {row.values.map((v, i) => <span key={i}>{v}</span>)}
                <span className="hi">{row.ai4cc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="compareNote">Pricing per public 2026 sources: Genesys <a href="https://www.platform28.com/blog/genesys-cloud-pricing-guide" target="_blank" rel="noopener">[1]</a>, RingCentral <a href="https://www.cloudtalk.io/blog/ringcentral-pricing/" target="_blank" rel="noopener">[2]</a>, Five9 <a href="https://www.platform28.com/blog/five9-pricing-breakdown" target="_blank" rel="noopener">[3]</a>, NICE CXone <a href="https://www.cloudtalk.io/blog/nice-cxone-pricing/" target="_blank" rel="noopener">[4]</a>. <strong>The implementation cost alone for an enterprise Five9 or NICE deployment ($50K–$500K+) exceeds AI4CC&apos;s entire $25,000 asking price — before a single month of subscription.</strong> AI4CC doesn&apos;t match every enterprise feature the majors have built over a decade — it matches the core a buyer would otherwise pay per seat, per month, forever, plus a setup fee to even begin. AI4CC buyers still operate their own infrastructure and usage-based third-party services.</p>
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
          <p>This homepage uses a static, sanitized example so public visitors never see another caller&apos;s personal information. The dedicated live demo shows the buyer the product operating in real time and then clears the display automatically.</p>
        </div>
        <div className="proofCard">
          <div className="proofRow"><span>Caller</span><b>Jordan Reyes</b></div>
          <div className="proofRow"><span>Business</span><b>Acme Fabrication</b></div>
          <div className="proofRow"><span>What they needed</span><b>Metal fabrication shop, 15 employees, six years in business — spreadsheet-based customer intake failing under order volume.</b></div>
          <div className="proofRow"><span>Service interest</span><b>Automated intake / CRM system to track leads and follow up.</b></div>
          <div className="proofRow"><span>Call duration</span><b>1 min 35 sec</b></div>
          <div className="proofRow result"><span>Result</span><b>Lead auto-created · pipeline stage: New</b></div>
        </div>
        <div className="proofActions">
          <Link href="/demo" className="buyerCta">Open the live buyer demo →</Link>
        </div>
      </section>

      <section className="capabilities">
        <Title eyebrow="THE PLATFORM" title="More than one feature — a full operating system" />
        <div className="capGrid">
          {PLATFORM_PAGES.map(p => (
            <Link href={p.href} className="capCard" key={p.href}>
              <small>{p.eyebrow}</small>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className="capLink">Explore this section →</span>
            </Link>
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
        <p>AI4CC is pre-revenue and has never been publicly launched — offered on documented development cost and
          production maturity, not a revenue multiple. Full technical diligence, architecture documentation and
          a guided walkthrough are available under NDA.</p>
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

      .ctaRow{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
      .callCta{display:flex;flex-direction:column;gap:2px;text-decoration:none;background:#69d8ff;color:#06111f;padding:16px 26px;border-radius:12px;box-shadow:0 0 0 1px rgba(105,216,255,.4), 0 18px 40px -12px rgba(105,216,255,.45);}
      .callCta.small{padding:13px 22px;flex-direction:row;align-items:center}
      .callLabel{font-size:.66rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;opacity:.75}
      .callNumber{font-size:1.4rem;font-weight:900;letter-spacing:-.01em}
      :global(.buyerCta){display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:13px 18px;border:1px solid rgba(105,216,255,.7);border-radius:10px;background:rgba(105,216,255,.08);color:#69d8ff;text-decoration:none;font-size:.78rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;transition:background .15s,border-color .15s,transform .15s}
      :global(.buyerCta:hover){background:rgba(105,216,255,.15);border-color:#69d8ff;transform:translateY(-1px);text-decoration:none}
      :global(.buyerCta.secondary){color:#d7e9f4;border-color:rgba(215,233,244,.28);background:rgba(255,255,255,.03)}

      .whatHow{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:0 0 36px;max-width:1000px}
      .whatHow small{display:block;color:#69d8ff;font-size:.64rem;font-weight:900;letter-spacing:.14em;margin-bottom:10px}
      .whatHow p{margin:0;color:#9eb3c4;line-height:1.7;font-size:.94rem}

      .compare{max-width:1240px;margin:0 auto;padding:24px 24px 80px}
      .compareScroll{margin-top:26px;overflow-x:auto;border:1px solid #19384d;border-radius:16px}
      .compareTable{width:100%}
      .compareRow{display:grid;grid-template-columns:150px repeat(4,140px) 170px;min-width:990px;border-bottom:1px solid #123047}
      .compareRow:last-child{border-bottom:none}
      .compareRow span{padding:12px 14px;font-size:.78rem;color:#a9bcc9;display:flex;align-items:center;overflow-wrap:break-word;min-width:0}
      .compareRow span:first-child{color:#c7d7e2;font-weight:700}
      .compareRow .hi{background:rgba(105,216,255,.07);color:#69d8ff;font-weight:800}
      .compareHead{background:rgba(255,255,255,.02)}
      .compareHead span{color:#718ba0;font-size:.66rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
      .compareHead .hi{color:#69d8ff}
      .compareNote{margin:18px 0 0;color:#5c7284;font-size:.78rem;line-height:1.7;max-width:900px}
      .compareNote a{color:#69d8ff;text-decoration:none}
      .compareNote a:hover{text-decoration:underline}

      .steps{max-width:1240px;margin:0 auto;padding:24px 24px 72px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
      .step{border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.72);padding:26px}
      .stepN{color:#3f5b70;font-size:.72rem;font-weight:900;letter-spacing:.14em}
      .step h3{margin:12px 0 8px;font-size:1.15rem;color:#eef8ff}
      .step p{margin:0;color:#8ea2b3;font-size:.86rem;line-height:1.6}

      .proof{max-width:1240px;margin:0 auto;padding:24px 24px 46px}
      .proofHead{max-width:760px;margin-bottom:26px}
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
      .proofActions{display:flex;margin-top:16px}

      .capabilities{max-width:1240px;margin:0 auto;padding:24px 24px 88px}
      .capGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:28px}
      :global(.capCard){display:block;border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.72);padding:22px;text-decoration:none;transition:border-color .15s,transform .15s}
      :global(.capCard:hover){border-color:#69d8ff;transform:translateY(-2px)}
      :global(.capCard small){display:block;color:#69d8ff;font-size:.62rem;font-weight:900;letter-spacing:.12em;margin-bottom:10px}
      :global(.capCard h3){margin:0 0 10px;font-size:1.02rem;color:#eef8ff;line-height:1.3}
      :global(.capCard p){margin:0 0 16px;color:#a9bcc9;font-size:.82rem;line-height:1.55}
      :global(.capLink){color:#69d8ff;font-size:.72rem;font-weight:800}

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
        .whatHow{grid-template-columns:1fr}
      }
      @media(max-width:600px){
        .capGrid{grid-template-columns:1fr}
        .hero{padding-top:58px}
        .ctaRow{align-items:stretch}
        .callCta,:global(.buyerCta){width:100%}
        .callCta{align-items:center;text-align:center}
        .proofActions,:global(.proofActions .buyerCta){width:100%}
      }
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
