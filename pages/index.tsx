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
        <h1>INTELLIGENT CUSTOMER ENGAGEMENT <span>OPERATION CENTER.</span></h1>
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
            <small>NO INFRASTRUCTURE CONFIGURATION CHANGES NEEDED</small>
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
      :global(body){margin:0;background:#071a3c;color:#eef3ff;font-family:Arial,sans-serif}
      .page{color:#eef3ff;background:#071a3c}
      .hero,.painSection,.journey,.industries,.platformStory,.proof,.fit{max-width:1240px;margin:0 auto;padding-left:24px;padding-right:24px}
      .hero{padding-top:96px;padding-bottom:78px;border-bottom:1px solid rgba(213,174,85,.40)}
      .eyebrow,.sectionHead small,.experience small,.closing small,.easyInstall small{color:#d5ae55;font-size:.72rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
      h1,h2,.sectionHead h2,.experience h2,.closing h2,.easyInstall h2{font-family:Georgia,"Times New Roman",serif;font-weight:400;letter-spacing:0;color:#fff}
      h1{font-size:clamp(2.8rem,6vw,5.4rem);line-height:1.04;margin:18px 0 24px;max-width:1080px}
      h1 span,.painSection h2 span,.easyInstall h2 span{color:#e8cb87;font-style:italic}
      .heroKicker{max-width:900px;color:#e8cb87;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .heroLead,.sectionHead p,.easyInstall p,.industryCard p,.capCard p,.experience p,.closing p{color:#c7d1e2;line-height:1.78}
      .heroLead{max-width:930px;font-size:1.1rem}
      .heroStatement,.heroInstall,.painClose,.journeyClose,.installClose{border-left:4px solid #d5ae55;background:#041329;color:#fff;padding:1.15rem 1.3rem;margin-top:1.4rem}
      .heroStatement,.painClose,.journeyClose,.installClose{font-family:Georgia,"Times New Roman",serif;font-size:1.15rem}
      .heroInstall{font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#e8cb87}
      .ctaRow,.closingActions,.experienceActions{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:2rem}
      .callCta,.buyerCta{border:1px solid #d5ae55;border-radius:0;padding:1rem 1.35rem;text-decoration:none;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
      .callCta{background:#d5ae55;color:#071a3c;min-width:250px}.buyerCta{background:transparent;color:#e8cb87}
      .callLabel{display:block;font-size:.64rem}.callNumber{display:block;font-family:Georgia,"Times New Roman",serif;font-size:1.28rem;letter-spacing:0;margin-top:.25rem}
      .livePrompt{color:#c7d1e2;margin-top:.9rem}
      .painSection,.journey,.industries,.platformStory,.proof,.fit,.easyInstall{padding-top:72px;padding-bottom:72px}
      .painSection,.journey,.platformStory,.proof,.fit{background:#0f2a6a}
      .industries,.easyInstall{background:#071a3c}
      .sectionHead h2,.easyInstall h2,.experience h2,.closing h2{font-size:clamp(2.15rem,4.2vw,3.65rem);line-height:1.1;margin:.5rem 0 1rem;max-width:1000px}
      .painGrid,.industryGrid,.capGrid,.installHighlights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin-top:2rem}
      .painItem,.industryCard,.capCard,.installHighlights>div,.proofCard,.installPromise{background:#133574;border:1px solid rgba(232,203,135,.28);border-top:3px solid #d5ae55;padding:1.5rem;color:#eef3ff}
      .painItem{font-family:Georgia,"Times New Roman",serif;color:#e8cb87;font-size:1.05rem}
      .industryCard h3,.capCard h3{font-family:Georgia,"Times New Roman",serif;font-weight:400;color:#e8cb87;margin-top:0}
      .capCard{text-decoration:none}.capCard span{color:#e8cb87}.capCard small{color:#d5ae55;letter-spacing:.14em}
      .easyInstall{max-width:1240px;margin:0 auto;padding-left:24px;padding-right:24px}
      .easyInstallTop{display:grid;grid-template-columns:2fr 1fr;gap:1.25rem}.installPromise strong{color:#e8cb87}
      .installFlow{display:flex;gap:.7rem;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:2rem 0;padding:1.2rem;border-top:1px solid rgba(213,174,85,.4);border-bottom:1px solid rgba(213,174,85,.4);color:#fff}.installFlow span{color:#d5ae55}
      .flowGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin-top:2rem}.flowItem{background:#133574;border-top:3px solid #d5ae55;padding:1.35rem}.flowItem span{display:block;color:#d5ae55;font-size:.7rem;letter-spacing:.14em;margin-bottom:.65rem}.flowItem b{font-family:Georgia,"Times New Roman",serif;font-weight:400}
      .experience,.closing{background:#0b2453;border-top:1px solid #d5ae55;border-bottom:1px solid #d5ae55;padding:72px 24px}.experience{display:flex;justify-content:space-between;gap:2rem;align-items:center}.experience>div:first-child{max-width:760px}
      .proofRow{display:grid;grid-template-columns:170px 1fr;gap:1rem;padding:.9rem 0;border-bottom:1px solid rgba(255,255,255,.14)}.proofRow:last-child{border-bottom:0}.proofRow span{color:#d5ae55;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em}
      .fit ul{list-style:none;padding:0;margin:2rem 0 0}.fit li{padding:1rem 0;border-bottom:1px solid rgba(255,255,255,.14);font-family:Georgia,"Times New Roman",serif}
      .closing{text-align:left}.closing>*,.experience>*{max-width:1240px}.partnerFoot{margin-top:2rem;color:#c7d1e2}.partnerFoot a{color:#e8cb87}
      @media(max-width:850px){.painGrid,.industryGrid,.capGrid,.installHighlights,.flowGrid,.easyInstallTop{grid-template-columns:1fr}.experience{display:block}.ctaRow,.closingActions,.experienceActions{flex-direction:column}.callCta,.buyerCta{width:100%}.hero{padding-top:64px}.proofRow{grid-template-columns:1fr}.installFlow{display:grid;grid-template-columns:1fr}.installFlow span{transform:rotate(90deg);justify-self:start}}
    `}</style>
  </>;
}
