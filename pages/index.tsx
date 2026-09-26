import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PHONE_DISPLAY = '(725) 330-5102';
const PHONE_TEL = 'tel:+17253305102';

const FLOW = [
  'Customer calls',
  'Stellar answers',
  'Need is understood',
  'Customer information is captured',
  'Lead is created',
  'Customer 360 is updated',
  'Follow-up is organized',
  'Your team takes action',
];

const PAIN_POINTS = [
  'Missed calls',
  'Overloaded staff',
  'Repetitive questions',
  'Lost leads',
  'After-hours calls',
  'Too many transfers',
  'Poor follow-up',
  'Voicemail backlog',
];

const FINANCIAL_POINTS = [
  { title: 'Avoided infrastructure replacement', body: 'Keep your phones, your provider and your existing workflows. Nothing has to be ripped out to add capacity.' },
  { title: 'Less overtime pressure', body: 'Overflow and after-hours volume is absorbed without stretching the people you already pay.' },
  { title: 'Better use of existing staff', body: 'Your people spend their time on the customers and decisions that need them, not on repetitive intake.' },
  { title: 'Fewer missed opportunities', body: 'Every inquiry is answered, captured and organized, so revenue is not lost to a busy signal or a voicemail box.' },
  { title: 'Continuous coverage', body: 'Business hours, overflow, after-hours, weekends and holidays, handled the same way every time.' },
  { title: 'Scale without scaling operations', body: 'Grow customer engagement without growing a traditional staffing and contact-center operation at the same rate.' },
];

const VALUE_LAYERS = [
  { title: 'Platform', body: 'The recurring Stellar technology and operational capability: answering, intake, qualification, routing, escalation, lead capture, Customer 360 and follow-up in one operating environment.' },
  { title: 'Implementation', body: 'The work of configuring that capability around your organization: your call flows, hours, teams, escalation rules, knowledge and workspace, tested before it takes a single live call.' },
  { title: 'Managed operations and support', body: 'The ongoing human expertise that modifies, optimizes and maintains your environment as your business changes, so the system keeps performing.' },
];

const INDUSTRIES = [
  { title: 'Home / Field Services', body: 'HVAC · Plumbing · Electrical · Roofing · Restoration and other field-service operations' },
  { title: 'Property Management', body: 'Resident inquiries · Leasing calls · Maintenance requests · After-hours call handling' },
  { title: 'Automotive Service Operations', body: 'Service inquiries · Appointment requests · Customer intake · Follow-up' },
];

const PLATFORM_PAGES = [
  { href: '/platform/flow-authoring', eyebrow: 'FLOW AUTHORING', title: 'Build call logic without writing code', body: 'Script Builder, Visual Flow Designer, simulation, auto-repair and version history.' },
  { href: '/platform/live-operations', eyebrow: 'LIVE OPERATIONS', title: 'Where conversations become customers', body: 'Agent Workspace, Lead Management, Activities, Tasks and Customer 360 in one operating environment.' },
  { href: '/platform/intelligence-qa', eyebrow: 'INTELLIGENCE & QA', title: 'Know what happened on every call', body: 'Analytics, transcript intelligence, quality scoring, coaching, intent taxonomy and routing optimization.' },
  { href: '/platform/governance-platform', eyebrow: 'GOVERNANCE & PLATFORM', title: 'A platform built to grow', body: 'Governance, access controls, flow management and shared platform services support broader commercialization.' },
];

const BUSINESS_FIT = [
  'Communication volume has become an operational problem',
  'You have more customer demand than your current people and processes can consistently handle',
  'After-hours and missed calls can mean lost revenue',
  'You want to add coverage without replacing your phones, your provider or your people',
  'Calls need to become organized leads, tasks and follow-up',
  'You need one operating view of every customer, not another disconnected tool',
];

export default function HomePage() {
  return <>
    <Head>
      <title>Stellar Unified Communications — Intelligent Customer Engagement Operation Center</title>
      <meta name="description" content="Keep your number. Add the intelligence. Stellar is an intelligent customer engagement operation center that adds answering, intake, routing, escalation, lead capture and follow-up capacity without replacing your phones, your provider or your people." />
    </Head>
    <Header />
    <main className="page">
      <section className="hero">
        <div className="eyebrow">STELLAR UNIFIED COMMUNICATIONS · INTELLIGENT CUSTOMER ENGAGEMENT OPERATION CENTER</div>
        <h1>Keep your number. <span>Add the intelligence.</span></h1>
        <p className="heroKicker">STELLAR IS NOT AN ANSWERING SERVICE. IT IS AN INTELLIGENT CUSTOMER-OPERATIONS LAYER.</p>
        <p className="heroLead">For organizations where communication volume has become an operational problem. Stellar adds capacity for answering, intake, qualification, routing, escalation, lead capture and after-hours coverage, without replacing your phones, your provider or your people.</p>
        <div className="heroStatement">Stellar doesn’t replace your people. <strong>It expands what your people can cover.</strong></div>
        <div className="heroInstall">KEEP YOUR NUMBER · KEEP YOUR PHONES · KEEP YOUR PROVIDER · ADD THE INTELLIGENCE</div>
        <div className="ctaRow">
          <a href={PHONE_TEL} className="callCta">
            <span className="callLabel">Call the live demo line</span>
            <span className="callNumber">{PHONE_DISPLAY}</span>
          </a>
          <a href="#stellar-review" className="buyerCta">Request a Stellar Review →</a>
        </div>
        <p className="livePrompt">Hear the operation center on a real phone line.</p>
      </section>

      <section className="painSection">
        <div className="sectionHead">
          <small>THE OPERATIONAL PROBLEM</small>
          <h2>More customer demand than your people and processes <span>can consistently handle.</span></h2>
          <p>Customer demand does not stop when your staff is busy, helping someone else, or off the clock. Stellar adds capacity for answering, intake, qualification, routing, escalation, lead capture, after-hours coverage, Customer 360 and follow-up.</p>
        </div>
        <div className="painGrid">
          {PAIN_POINTS.map(item => <div className="painItem" key={item}>{item}</div>)}
        </div>
        <div className="painClose">STELLAR HANDLES THE CONVERSATION <strong>AND WHAT HAPPENS NEXT.</strong></div>
      </section>

      <section className="industries">
        <div className="sectionHead">
          <small>THE FINANCIAL PROBLEM</small>
          <h2>How do you add customer-service capacity without building an expensive 24/7 staffing and contact-center operation?</h2>
          <p>The financial case isn’t simply labor reduction. It is the full cost of covering your customers, with and without Stellar.</p>
        </div>
        <div className="industryGrid">
          {FINANCIAL_POINTS.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}
        </div>
        <div className="painClose">THE QUESTION ISN’T WHAT STELLAR COSTS. <strong>IT’S WHAT EQUIVALENT COVERAGE COSTS WITHOUT IT.</strong></div>
      </section>

      <section className="easyInstall">
        <div className="easyInstallTop">
          <div>
            <small>NO MANDATORY INFRASTRUCTURE REPLACEMENT</small>
            <h2>Keep your number. <span>Add the intelligence.</span></h2>
            <p>You do not have to replace the business number your customers already know or rebuild your communications system. Forward your calls to Stellar, and we configure the customer-operations workflow around your organization, then manage it with you.</p>
          </div>
          <div className="installPromise">
            <strong>YOUR STELLAR WORKSPACE</strong>
            <p>Your team gets its own workspace for customer interactions, leads, activities, tasks, follow-up and Customer 360.</p>
          </div>
        </div>
        <div className="installFlow">
          <b>YOUR EXISTING NUMBER</b><span>→</span><b>CALL FORWARDING</b><span>→</span><b>STELLAR</b><span>→</span><b>YOUR WORKSPACE</b><span>→</span><b>YOUR TEAM</b>
        </div>
        <div className="installHighlights">
          <div><strong>DEPLOY WHERE THE PRESSURE EXISTS</strong><p>One business. One location. One department. One high-volume operation.</p></div>
          <div><strong>WE CONFIGURE AND MANAGE IT</strong><p>Intake, routing, escalation and workflows built around your business and kept current.</p></div>
          <div><strong>PROVE THE VALUE. EXPAND WHEN IT MAKES SENSE.</strong><p>Start where calls hurt most, then extend coverage as the results show.</p></div>
        </div>
        <div className="installClose">Forward your calls. We configure the system. <strong>Your people cover more.</strong></div>
      </section>

      <section className="journey">
        <div className="sectionHead">
          <small>ANSWER · UNDERSTAND · QUALIFY · CAPTURE · ROUTE · ESCALATE · ORGANIZE · FOLLOW UP</small>
          <h2>A phone call should not end when the customer hangs up.</h2>
          <p>Stellar turns customer conversations into structured business activity, with no disconnected notes, no information trapped inside calls, and no lead left without an operational next step.</p>
        </div>
        <div className="flowGrid">
          {FLOW.map((item, i) => <div className="flowItem" key={item}><span>{String(i + 1).padStart(2, '0')}</span><b>{item}</b></div>)}
        </div>
        <div className="journeyClose">FROM CONVERSATION → TO CUSTOMER → TO ACTION</div>
      </section>

      <section className="platformStory">
        <div className="sectionHead">
          <small>ONE OPERATING ENVIRONMENT</small>
          <h2>The intelligence continues after the conversation.</h2>
          <p>Voice, SMS and web chat intake · Lead Management · Activities and Tasks · Customer 360 · Agent Workspace · Quality and compliance monitoring · Operational analytics.</p>
        </div>
        <div className="capGrid">
          {PLATFORM_PAGES.map(p => (
            <Link href={p.href} className="capCard" key={p.href}>
              <small>{p.eyebrow}</small><h3>{p.title}</h3><p>{p.body}</p><span>Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="industries">
        <div className="sectionHead">
          <small>WHAT YOU ARE SUBSCRIBING TO</small>
          <h2>Three kinds of value. Delivered as one operation.</h2>
          <p>A customer-operations capability is more than software. Stellar brings the technology, the configuration around your organization, and the ongoing expertise to keep it working.</p>
        </div>
        <div className="industryGrid">
          {VALUE_LAYERS.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}
        </div>
      </section>

      <section className="experience">
        <div>
          <small>LIVE DEMONSTRATION LINE</small>
          <h2>Hear it on a real phone line.</h2>
          <p>Call the demonstration line, then see how the platform carries that call into structured customer intake, lead management and follow-up.</p>
        </div>
        <div className="experienceActions">
          <a href={PHONE_TEL} className="callCta"><span className="callLabel">Call the live demo line</span><span className="callNumber">{PHONE_DISPLAY}</span></a>
          <Link href="/demo" className="buyerCta">See what happens next →</Link>
        </div>
      </section>

      <section className="industries">
        <div className="sectionHead">
          <small>INITIAL FOCUS</small>
          <h2>Built for operations where call volume has become the pressure point.</h2>
          <p>Stellar applies wherever customer communication matters. We are starting with three high-volume operating environments.</p>
        </div>
        <div className="industryGrid">
          {INDUSTRIES.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}
        </div>
      </section>

      <section id="proof" className="proof">
        <div className="sectionHead">
          <small>REAL CALL · OWNER-TESTED END TO END</small>
          <h2>See what the platform does with the conversation.</h2>
          <p>The public homepage uses a sanitized example. The dedicated demo lets a prospective customer experience the product flow directly.</p>
        </div>
        <div className="proofCard">
          <div className="proofRow"><span>Caller</span><b>Jordan Reyes</b></div>
          <div className="proofRow"><span>Business</span><b>Acme Fabrication</b></div>
          <div className="proofRow"><span>Need identified</span><b>Customer intake and CRM workflow to manage growing order volume.</b></div>
          <div className="proofRow"><span>Result</span><b>Structured lead created · pipeline stage: New</b></div>
        </div>
      </section>

      <section className="fit">
        <div className="sectionHead"><small>WHO STELLAR IS FOR</small><h2>Built for organizations that cannot afford to lose the customer.</h2></div>
        <ul>{BUSINESS_FIT.map(item => <li key={item}>{item}</li>)}</ul>
      </section>

      <section id="stellar-review" className="closing">
        <small>STELLAR · INTELLIGENT CUSTOMER ENGAGEMENT OPERATION CENTER</small>
        <h2>Premium system. Cost-effective solution.</h2>
        <p>Stellar is not positioned as a cheap answering service. It is a managed customer-operations system designed to deliver substantial operational and financial value. Keep your number, your phones and your provider, and add the intelligence.</p>
        <div className="closingActions">
          <a href={PHONE_TEL} className="callCta"><span className="callLabel">Call the live demo line</span><span className="callNumber">{PHONE_DISPLAY}</span></a>
          <Link href="/demo" className="buyerCta">Request a Stellar Review →</Link>
        </div>
        <p className="livePrompt closingPrompt">Hear the operation center on a real phone line.</p>
        <div className="partnerFoot">Technology provider, MSP, telecom or reseller? <Link href="/partners">Explore Partner &amp; White-Label Opportunities →</Link></div>
      </section>
    </main>
    <Footer />

    <style jsx>{`
      :global(*){box-sizing:border-box}
      :global(body){margin:0;background:#06111f}
      .page{color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f)}
      .hero,.painSection,.journey,.industries,.platformStory,.proof,.fit{max-width:1240px;margin:0 auto;padding-left:24px;padding-right:24px}
      .hero{padding-top:88px;padding-bottom:70px}
      .eyebrow,.sectionHead small,.experience small,.audienceCard small,.closing small,.easyInstall small{color:#69d8ff;font-size:.66rem;font-weight:900;letter-spacing:.16em}
      h1{font-size:clamp(2.8rem,6vw,5.3rem);line-height:1.01;letter-spacing:-.045em;margin:16px 0 22px;max-width:1000px}
      h1 span,.painSection h2 span{color:#69d8ff}
      .heroKicker{max-width:820px;color:#eef8ff;font-size:.82rem;font-weight:900;letter-spacing:.1em;margin:0 0 14px}.heroLead{max-width:820px;color:#b3c7d5;font-size:1.12rem;line-height:1.75;margin:0 0 18px}
      .heroStatement{max-width:820px;border-left:3px solid #69d8ff;padding:10px 16px;color:#8ea2b3;font-size:1rem;margin-bottom:16px}.heroStatement strong{color:#eef8ff}
      .livePrompt{color:#8ea2b3;font-size:.82rem;margin:14px 0 0;font-weight:700}.heroInstall{display:inline-block;margin:0 0 28px;padding:9px 13px;border:1px solid rgba(105,216,255,.35);border-radius:8px;background:rgba(105,216,255,.07);color:#69d8ff;font-size:.68rem;font-weight:900;letter-spacing:.1em}
      .ctaRow,.closingActions{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
      .callCta{display:flex;flex-direction:column;gap:2px;text-decoration:none;background:#69d8ff;color:#06111f;padding:16px 26px;border-radius:12px;box-shadow:0 0 0 1px rgba(105,216,255,.4),0 18px 40px -12px rgba(105,216,255,.45)}
      .callLabel{font-size:.66rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;opacity:.75}.callNumber{font-size:1.4rem;font-weight:900}
      :global(.buyerCta){display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:13px 18px;border:1px solid rgba(105,216,255,.7);border-radius:10px;background:rgba(105,216,255,.08);color:#69d8ff;text-decoration:none;font-size:.76rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
      :global(.buyerCta.secondary){color:#d7e9f4;border-color:rgba(215,233,244,.28);background:rgba(255,255,255,.03)}
      .sectionHead{max-width:820px;margin-bottom:30px}.sectionHead h2,.experience h2,.closing h2{font-size:clamp(2rem,4vw,3.2rem);letter-spacing:-.035em;line-height:1.08;margin:10px 0 14px}.sectionHead p,.experience p,.closing p{color:#8ea2b3;line-height:1.7;font-size:.96rem;margin:0}
      .painSection{padding-top:24px;padding-bottom:90px}.painGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.painItem{border:1px solid #19384d;border-radius:12px;background:rgba(7,24,38,.72);padding:18px;color:#d7e9f4;font-size:.8rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.painClose{margin-top:22px;border-left:3px solid #69d8ff;padding:12px 16px;color:#a9bcc9;font-weight:800}.painClose strong{color:#eef8ff}.valueSection{padding-top:32px;padding-bottom:90px}.valueGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.valueCard,.industryCard,.audienceCard{border:1px solid #19384d;border-radius:15px;background:rgba(7,24,38,.72);padding:24px}.valueCard h3,.industryCard h3,.audienceCard h3{margin:0 0 9px;font-size:1.05rem}.valueCard p,.industryCard p,.audienceCard p{margin:0;color:#8ea2b3;line-height:1.6;font-size:.86rem}
      .easyInstall{max-width:1192px;margin:0 auto 90px;padding:38px;border:1px solid rgba(105,216,255,.48);border-radius:22px;background:linear-gradient(135deg,rgba(105,216,255,.13),rgba(7,24,38,.92) 58%,rgba(105,216,255,.06));box-shadow:0 24px 70px -38px rgba(105,216,255,.65)}
      .easyInstallTop{display:grid;grid-template-columns:1.35fr .65fr;gap:28px;align-items:start}.easyInstall h2{font-size:clamp(2.2rem,4.6vw,3.7rem);letter-spacing:-.04em;line-height:1.04;margin:10px 0 16px}.easyInstall h2 span{color:#69d8ff}.easyInstallTop>div>p,.installPromise p{color:#a8bdcb;line-height:1.7;margin:0}.installPromise{border:1px solid rgba(105,216,255,.28);border-radius:14px;background:rgba(6,17,31,.7);padding:22px}.installPromise strong,.installHighlights strong{color:#eef8ff;font-size:.78rem;letter-spacing:.08em}.installPromise p{font-size:.88rem;margin-top:10px}.installFlow{margin:30px 0 20px;padding:18px;border:1px solid #19384d;border-radius:13px;background:#06111f;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;text-align:center}.installFlow b{font-size:.72rem;letter-spacing:.07em;color:#d7e9f4}.installFlow span{color:#69d8ff;font-weight:900}.installHighlights{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.installHighlights>div{padding:18px;border-radius:12px;background:rgba(7,24,38,.72);border:1px solid #19384d}.installHighlights p{color:#8ea2b3;font-size:.82rem;line-height:1.55;margin:7px 0 0}.installClose{text-align:center;margin-top:24px;color:#b3c7d5;font-size:1rem}.installClose strong{color:#69d8ff}
      .journey{padding-top:24px;padding-bottom:90px}.flowGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.flowItem{border:1px solid #19384d;border-radius:12px;padding:18px;background:rgba(7,24,38,.62);display:flex;gap:12px;align-items:center}.flowItem span{color:#3f5b70;font-size:.68rem;font-weight:900}.flowItem b{font-size:.85rem;color:#d7e9f4}.journeyClose{text-align:center;color:#69d8ff;font-size:.76rem;font-weight:900;letter-spacing:.12em;margin-top:24px}
      .experience{max-width:1192px;margin:0 auto 90px;border:1px solid rgba(105,216,255,.35);border-radius:18px;background:linear-gradient(135deg,rgba(105,216,255,.10),rgba(7,24,38,.72));padding:34px;display:grid;grid-template-columns:1fr auto;gap:32px;align-items:center}.experience h2{font-size:2.2rem}.experienceActions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
      .industries{padding-bottom:90px}.industryGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.industryCard{padding:20px}.industryCard h3{color:#69d8ff}
      .platformStory{padding-bottom:90px}.capGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}:global(.capCard){display:block;border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.72);padding:22px;text-decoration:none}:global(.capCard small){display:block;color:#69d8ff;font-size:.62rem;font-weight:900;letter-spacing:.12em;margin-bottom:10px}:global(.capCard h3){margin:0 0 10px;color:#eef8ff;font-size:1.02rem;line-height:1.3}:global(.capCard p){margin:0 0 16px;color:#a9bcc9;font-size:.82rem;line-height:1.55}:global(.capCard span){color:#69d8ff;font-size:.72rem;font-weight:800}
      .proof{padding-bottom:90px}.proofCard{border:1px solid #19384d;border-radius:16px;background:rgba(7,24,38,.72);padding:8px;max-width:780px}.proofRow{display:grid;grid-template-columns:170px 1fr;gap:16px;padding:16px 20px;border-bottom:1px solid #123047}.proofRow:last-child{border-bottom:none}.proofRow span{color:#718ba0;font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.proofRow b{color:#d7e9f4;font-size:.9rem;line-height:1.5}.proofRow:last-child b{color:#69d8ff}
      .audiences{padding-bottom:90px}.audienceGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.audienceCard h3{font-size:1.3rem;margin-top:10px}.audienceCard p{margin-bottom:18px}:global(.audienceCard a){color:#69d8ff;text-decoration:none;font-size:.78rem;font-weight:900}
      .fit{padding-bottom:90px}.fit ul{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:12px 30px;max-width:1000px}.fit li{color:#c7d7e2;line-height:1.5;padding-left:25px;position:relative}.fit li:before{content:'✓';position:absolute;left:0;color:#5ee6a8;font-weight:900}
      .closing{max-width:1000px;margin:0 auto;padding:28px 24px 110px;text-align:center}.closing p{max-width:700px;margin:0 auto 28px}.closingActions{justify-content:center}.closingPrompt{margin-top:18px!important}.partnerFoot{margin:34px auto 0;padding-top:22px;border-top:1px solid #19384d;color:#718ba0;font-size:.78rem}.partnerFoot :global(a){color:#69d8ff;text-decoration:none;font-weight:800}
      @media(max-width:900px){.painGrid,.valueGrid{grid-template-columns:1fr 1fr}.flowGrid,.industryGrid,.capGrid{grid-template-columns:1fr 1fr}.audienceGrid{grid-template-columns:1fr}.experience,.easyInstallTop{grid-template-columns:1fr}.fit ul{grid-template-columns:1fr}.proofRow{grid-template-columns:1fr;gap:5px}.installHighlights{grid-template-columns:1fr}}
      @media(max-width:600px){.hero{padding-top:58px}.painGrid,.valueGrid,.flowGrid,.industryGrid,.capGrid{grid-template-columns:1fr}.ctaRow,.closingActions,.experienceActions{align-items:stretch}.callCta,:global(.buyerCta){width:100%;align-items:center;text-align:center}.experience,.easyInstall{margin-left:18px;margin-right:18px;padding:26px 20px}.installFlow{align-items:stretch;flex-direction:column}.installFlow span{transform:rotate(90deg)}.heroInstall{line-height:1.6}}
    `}</style>
  </>;
}