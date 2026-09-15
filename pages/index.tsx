import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PHONE_DISPLAY = '(725) 330-5102';
const PHONE_TEL = 'tel:+17253305102';

const VALUE_CARDS = [
  { title: 'Answer 24/7', body: 'Give customers an intelligent front door that can respond when your staff is unavailable, busy, or after hours.' },
  { title: 'Capture every lead', body: 'Turn conversations into structured lead records instead of leaving valuable customer information trapped inside calls and notes.' },
  { title: 'Automate intake', body: 'Collect the customer name, business, need, urgency, and service interest through a natural conversational experience.' },
  { title: 'Organize follow-up', body: 'Carry the conversation into Lead Management, Activities and Tasks so the next action is visible to your team.' },
  { title: 'Know your customer', body: 'Bring customer identity, interactions, leads and follow-up activity together through Customer 360.' },
  { title: 'Connect AI + people', body: 'Use conversational AI as the front door while keeping your team and the contact center in control of the customer relationship.' },
];

const FLOW = [
  'Customer calls',
  'AI answers',
  'Need is understood',
  'Customer information is captured',
  'Lead is created',
  'Customer 360 is updated',
  'Follow-up is organized',
  'Your team takes action',
];

const INDUSTRIES = [
  { title: 'Home Services', body: 'HVAC · Plumbing · Electrical · Roofing · Restoration' },
  { title: 'Legal Services', body: 'Client intake · Lead qualification · Follow-up' },
  { title: 'Healthcare & Dental', body: 'Patient inquiries · Service navigation · Follow-up' },
  { title: 'Senior & Home Care', body: 'Family inquiries · Service qualification · Follow-up' },
  { title: 'Insurance', body: 'Prospect intake · Quote inquiries · Customer follow-up' },
  { title: 'Automotive', body: 'Sales inquiries · Service requests · Customer management' },
  { title: 'Real Estate', body: 'Buyer and seller inquiries · Qualification · Follow-up' },
  { title: 'Professional Services', body: 'New-client intake · Qualification · Relationship management' },
];

const PLATFORM_PAGES = [
  { href: '/platform/flow-authoring', eyebrow: 'FLOW AUTHORING', title: 'Build call logic without writing code', body: 'AI Script Builder, Visual Flow Designer, simulation, auto-repair and version history.' },
  { href: '/platform/live-operations', eyebrow: 'LIVE OPERATIONS', title: 'Where conversations become customers', body: 'Agent Workspace, Lead Management, Activities, Tasks and Customer 360 in one operating environment.' },
  { href: '/platform/intelligence-qa', eyebrow: 'INTELLIGENCE & QA', title: 'Know what happened on every call', body: 'Analytics, transcript intelligence, quality scoring, coaching, intent taxonomy and routing optimization.' },
  { href: '/platform/governance-platform', eyebrow: 'GOVERNANCE & PLATFORM', title: 'A platform built to grow', body: 'Governance, access controls, flow management and shared platform services support broader commercialization.' },
];

const BUYERS = [
  'Businesses that cannot afford to miss high-value inbound calls',
  'AI SaaS operators looking for a working platform instead of a ground-up build',
  'Contact-center and CPaaS companies extending their technology stack',
  'CRM and automation vendors adding conversational voice capability',
  'MSPs and BPOs seeking a deployable AI intake and customer-management product',
  'Operators exploring strategic licensing, white-label deployment or acquisition',
];

export default function HomePage() {
  return <>
    <Head>
      <title>AI4 Contact Center — Turn Customer Conversations Into Business Opportunities</title>
      <meta name="description" content="AI4 Intelligent Contact Center combines 24/7 conversational AI, Lead Management, Customer 360, Voice, SMS and Web Chat. Keep your number, forward your calls, and access your customized AI4CC dashboard." />
    </Head>
    <Header />
    <main className="page">
      <section className="hero">
        <div className="eyebrow">AI4 INTELLIGENT CONTACT CENTER (AI4CC) · APROPOS GROUP LLC</div>
        <h1>Every customer conversation is a <span>business opportunity.</span></h1>
        <p className="heroLead">AI4CC helps businesses answer more customer inquiries, capture more opportunities, organize follow-up and maintain a complete view of the customer relationship — with intelligent conversational AI available 24 hours a day.</p>
        <div className="heroStatement">Conversational AI handles the conversation. <strong>AI4CC handles what happens next.</strong></div>
        <div className="heroInstall">KEEP YOUR NUMBER · FORWARD YOUR CALLS · ACCESS YOUR CUSTOMIZED DASHBOARD</div>
        <div className="ctaRow">
          <a href={PHONE_TEL} className="callCta">
            <span className="callLabel">Experience the AI live</span>
            <span className="callNumber">{PHONE_DISPLAY}</span>
          </a>
          <Link href="/demo" className="buyerCta">Watch the live demo →</Link>
          <Link href="/acquisition" className="buyerCta secondary">Buyer walkthrough →</Link>
        </div>
      </section>

      <section className="valueSection">
        <div className="sectionHead">
          <small>BUILT FOR BUSINESS OUTCOMES</small>
          <h2>Never let a valuable customer conversation disappear.</h2>
          <p>An AI receptionist is only the beginning. AI4CC connects the conversation to the customer record, lead workflow and next action.</p>
        </div>
        <div className="valueGrid">
          {VALUE_CARDS.map(card => <div className="valueCard" key={card.title}><h3>{card.title}</h3><p>{card.body}</p></div>)}
        </div>
      </section>

      <section className="easyInstall">
        <div className="easyInstallTop">
          <div>
            <small>EASY INSTALLATION · FAST ADOPTION</small>
            <h2>Keep your number. <span>Add the intelligence.</span></h2>
            <p>You do not have to replace the business number your customers already know or rebuild your communications system. Forward your calls to AI4CC, and we configure the conversational experience and backend workflow around your organization.</p>
          </div>
          <div className="installPromise">
            <strong>YOUR CUSTOMIZED AI4CC DASHBOARD</strong>
            <p>Your team receives access to its own customized dashboard for customer interactions, leads, activities, tasks, follow-up and Customer 360.</p>
          </div>
        </div>
        <div className="installFlow">
          <b>YOUR EXISTING NUMBER</b><span>→</span><b>CALL FORWARDING</b><span>→</span><b>AI4CC</b><span>→</span><b>YOUR CUSTOMIZED DASHBOARD</b><span>→</span><b>YOUR TEAM</b>
        </div>
        <div className="installHighlights">
          <div><strong>KEEP YOUR NUMBER</strong><p>No new number for customers to remember.</p></div>
          <div><strong>WE CUSTOMIZE AI4CC</strong><p>AI intake, routing and workflows configured around your business.</p></div>
          <div><strong>ACCESS YOUR DASHBOARD</strong><p>Your operation stays visible, organized and ready for follow-up.</p></div>
        </div>
        <div className="installClose">Forward your calls. We configure the system. <strong>You’re up and running.</strong></div>
      </section>

      <section className="journey">
        <div className="sectionHead">
          <small>FROM CONVERSATION TO BUSINESS OPPORTUNITY</small>
          <h2>A phone call should not end when the customer hangs up.</h2>
          <p>AI4CC transforms customer conversations into structured business activity — without disconnected notes, information trapped inside calls, or leads left without an operational next step.</p>
        </div>
        <div className="flowGrid">
          {FLOW.map((item, i) => <div className="flowItem" key={item}><span>{String(i + 1).padStart(2, '0')}</span><b>{item}</b></div>)}
        </div>
        <div className="journeyClose">FROM CONVERSATION → TO CUSTOMER → TO ACTION</div>
      </section>

      <section className="experience">
        <div>
          <small>LIVE TODAY</small>
          <h2>Don't take our word for it. Call the AI.</h2>
          <p>Experience the conversational front door on a real phone line. The AI conducts the intake conversation and the platform carries the result into its operational workflow.</p>
        </div>
        <div className="experienceActions">
          <a href={PHONE_TEL} className="callCta"><span className="callLabel">Call the AI now</span><span className="callNumber">{PHONE_DISPLAY}</span></a>
          <Link href="/demo" className="buyerCta">Open live demo →</Link>
        </div>
      </section>

      <section className="industries">
        <div className="sectionHead">
          <small>WHERE EVERY CALL MATTERS</small>
          <h2>Built for businesses where an unanswered inquiry can mean lost revenue.</h2>
        </div>
        <div className="industryGrid">
          {INDUSTRIES.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}
        </div>
      </section>

      <section className="platformStory">
        <div className="sectionHead">
          <small>MORE THAN AN AI RECEPTIONIST</small>
          <h2>The intelligence continues after the conversation.</h2>
          <p>Conversational AI + CRM + Lead Management + Activities + Tasks + Customer 360 + Agent Workspace + Voice/SMS/Web Chat + operational intelligence.</p>
        </div>
        <div className="capGrid">
          {PLATFORM_PAGES.map(p => (
            <Link href={p.href} className="capCard" key={p.href}>
              <small>{p.eyebrow}</small><h3>{p.title}</h3><p>{p.body}</p><span>Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="proof" className="proof">
        <div className="sectionHead">
          <small>REAL CALL · OWNER-TESTED END TO END</small>
          <h2>See what the platform does with the conversation.</h2>
          <p>The public homepage uses a sanitized example. The dedicated demo lets a prospective customer or buyer experience the product flow directly.</p>
        </div>
        <div className="proofCard">
          <div className="proofRow"><span>Caller</span><b>Jordan Reyes</b></div>
          <div className="proofRow"><span>Business</span><b>Acme Fabrication</b></div>
          <div className="proofRow"><span>Need identified</span><b>Customer intake and CRM workflow to manage growing order volume.</b></div>
          <div className="proofRow"><span>Result</span><b>Structured lead created · pipeline stage: New</b></div>
        </div>
      </section>

      <section className="audiences">
        <div className="sectionHead">
          <small>THREE COMMERCIAL PATHS</small>
          <h2>Use it. License it. Acquire it.</h2>
          <p>AI4CC can be evaluated as an operating customer solution, a strategic technology/white-label opportunity, or a complete technology asset.</p>
        </div>
        <div className="audienceGrid">
          <div className="audienceCard"><small>FOR OPERATING BUSINESSES</small><h3>Put AI4CC to work</h3><p>Keep your number, forward your calls, and operate from a customized AI4CC dashboard built around customer intake, lead capture and follow-up.</p><Link href="/demo">Experience the product →</Link></div>
          <div className="audienceCard"><small>FOR PARTNERS</small><h3>License or white-label</h3><p>Extend your customer-engagement offering with an existing platform rather than assembling every deployment from scratch.</p><Link href="/partners">Explore partnership →</Link></div>
          <div className="audienceCard"><small>FOR STRATEGIC BUYERS</small><h3>Acquire the technology</h3><p>Evaluate the working platform, architecture and documented technology asset through the buyer diligence path.</p><Link href="/acquisition">Buyer walkthrough →</Link></div>
        </div>
      </section>

      <section className="fit">
        <div className="sectionHead"><small>WHO THIS IS FOR</small><h2>Built to create commercial value.</h2></div>
        <ul>{BUYERS.map(item => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className="closing">
        <small>EASY TO ADOPT · BUILT TO OPERATE</small>
        <h2>Keep the number your customers know. Give every call more intelligence.</h2>
        <p>Forward your calls to AI4CC. We customize the system around your organization, and your team gets access to its own dashboard for customer interactions, leads and follow-up.</p>
        <div className="closingActions">
          <a href={PHONE_TEL} className="callCta"><span className="callLabel">Call the AI now</span><span className="callNumber">{PHONE_DISPLAY}</span></a>
          <Link href="/demo" className="buyerCta">Watch the live demo →</Link>
          <Link href="/acquisition" className="buyerCta secondary">Acquisition opportunity →</Link>
        </div>
      </section>
    </main>
    <Footer />

    <style jsx>{`
      :global(*){box-sizing:border-box}
      :global(body){margin:0;background:#06111f}
      .page{color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f)}
      .hero,.valueSection,.journey,.industries,.platformStory,.proof,.audiences,.fit{max-width:1240px;margin:0 auto;padding-left:24px;padding-right:24px}
      .hero{padding-top:88px;padding-bottom:70px}
      .eyebrow,.sectionHead small,.experience small,.audienceCard small,.closing small,.easyInstall small{color:#69d8ff;font-size:.66rem;font-weight:900;letter-spacing:.16em}
      h1{font-size:clamp(2.8rem,6vw,5.3rem);line-height:1.01;letter-spacing:-.045em;margin:16px 0 22px;max-width:1000px}
      h1 span{color:#69d8ff}
      .heroLead{max-width:820px;color:#b3c7d5;font-size:1.12rem;line-height:1.75;margin:0 0 18px}
      .heroStatement{max-width:820px;border-left:3px solid #69d8ff;padding:10px 16px;color:#8ea2b3;font-size:1rem;margin-bottom:16px}.heroStatement strong{color:#eef8ff}
      .heroInstall{display:inline-block;margin:0 0 28px;padding:9px 13px;border:1px solid rgba(105,216,255,.35);border-radius:8px;background:rgba(105,216,255,.07);color:#69d8ff;font-size:.68rem;font-weight:900;letter-spacing:.1em}
      .ctaRow,.closingActions{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
      .callCta{display:flex;flex-direction:column;gap:2px;text-decoration:none;background:#69d8ff;color:#06111f;padding:16px 26px;border-radius:12px;box-shadow:0 0 0 1px rgba(105,216,255,.4),0 18px 40px -12px rgba(105,216,255,.45)}
      .callLabel{font-size:.66rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;opacity:.75}.callNumber{font-size:1.4rem;font-weight:900}
      :global(.buyerCta){display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:13px 18px;border:1px solid rgba(105,216,255,.7);border-radius:10px;background:rgba(105,216,255,.08);color:#69d8ff;text-decoration:none;font-size:.76rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
      :global(.buyerCta.secondary){color:#d7e9f4;border-color:rgba(215,233,244,.28);background:rgba(255,255,255,.03)}
      .sectionHead{max-width:820px;margin-bottom:30px}.sectionHead h2,.experience h2,.closing h2{font-size:clamp(2rem,4vw,3.2rem);letter-spacing:-.035em;line-height:1.08;margin:10px 0 14px}.sectionHead p,.experience p,.closing p{color:#8ea2b3;line-height:1.7;font-size:.96rem;margin:0}
      .valueSection{padding-top:32px;padding-bottom:90px}.valueGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.valueCard,.industryCard,.audienceCard{border:1px solid #19384d;border-radius:15px;background:rgba(7,24,38,.72);padding:24px}.valueCard h3,.industryCard h3,.audienceCard h3{margin:0 0 9px;font-size:1.05rem}.valueCard p,.industryCard p,.audienceCard p{margin:0;color:#8ea2b3;line-height:1.6;font-size:.86rem}
      .easyInstall{max-width:1192px;margin:0 auto 90px;padding:38px;border:1px solid rgba(105,216,255,.48);border-radius:22px;background:linear-gradient(135deg,rgba(105,216,255,.13),rgba(7,24,38,.92) 58%,rgba(105,216,255,.06));box-shadow:0 24px 70px -38px rgba(105,216,255,.65)}
      .easyInstallTop{display:grid;grid-template-columns:1.35fr .65fr;gap:28px;align-items:start}.easyInstall h2{font-size:clamp(2.2rem,4.6vw,3.7rem);letter-spacing:-.04em;line-height:1.04;margin:10px 0 16px}.easyInstall h2 span{color:#69d8ff}.easyInstallTop>div>p,.installPromise p{color:#a8bdcb;line-height:1.7;margin:0}.installPromise{border:1px solid rgba(105,216,255,.28);border-radius:14px;background:rgba(6,17,31,.7);padding:22px}.installPromise strong,.installHighlights strong{color:#eef8ff;font-size:.78rem;letter-spacing:.08em}.installPromise p{font-size:.88rem;margin-top:10px}.installFlow{margin:30px 0 20px;padding:18px;border:1px solid #19384d;border-radius:13px;background:#06111f;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;text-align:center}.installFlow b{font-size:.72rem;letter-spacing:.07em;color:#d7e9f4}.installFlow span{color:#69d8ff;font-weight:900}.installHighlights{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.installHighlights>div{padding:18px;border-radius:12px;background:rgba(7,24,38,.72);border:1px solid #19384d}.installHighlights p{color:#8ea2b3;font-size:.82rem;line-height:1.55;margin:7px 0 0}.installClose{text-align:center;margin-top:24px;color:#b3c7d5;font-size:1rem}.installClose strong{color:#69d8ff}
      .journey{padding-top:24px;padding-bottom:90px}.flowGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.flowItem{border:1px solid #19384d;border-radius:12px;padding:18px;background:rgba(7,24,38,.62);display:flex;gap:12px;align-items:center}.flowItem span{color:#3f5b70;font-size:.68rem;font-weight:900}.flowItem b{font-size:.85rem;color:#d7e9f4}.journeyClose{text-align:center;color:#69d8ff;font-size:.76rem;font-weight:900;letter-spacing:.12em;margin-top:24px}
      .experience{max-width:1192px;margin:0 auto 90px;border:1px solid rgba(105,216,255,.35);border-radius:18px;background:linear-gradient(135deg,rgba(105,216,255,.10),rgba(7,24,38,.72));padding:34px;display:grid;grid-template-columns:1fr auto;gap:32px;align-items:center}.experience h2{font-size:2.2rem}.experienceActions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
      .industries{padding-bottom:90px}.industryGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.industryCard{padding:20px}.industryCard h3{color:#69d8ff}
      .platformStory{padding-bottom:90px}.capGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}:global(.capCard){display:block;border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.72);padding:22px;text-decoration:none}:global(.capCard small){display:block;color:#69d8ff;font-size:.62rem;font-weight:900;letter-spacing:.12em;margin-bottom:10px}:global(.capCard h3){margin:0 0 10px;color:#eef8ff;font-size:1.02rem;line-height:1.3}:global(.capCard p){margin:0 0 16px;color:#a9bcc9;font-size:.82rem;line-height:1.55}:global(.capCard span){color:#69d8ff;font-size:.72rem;font-weight:800}
      .proof{padding-bottom:90px}.proofCard{border:1px solid #19384d;border-radius:16px;background:rgba(7,24,38,.72);padding:8px;max-width:780px}.proofRow{display:grid;grid-template-columns:170px 1fr;gap:16px;padding:16px 20px;border-bottom:1px solid #123047}.proofRow:last-child{border-bottom:none}.proofRow span{color:#718ba0;font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.proofRow b{color:#d7e9f4;font-size:.9rem;line-height:1.5}.proofRow:last-child b{color:#69d8ff}
      .audiences{padding-bottom:90px}.audienceGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.audienceCard h3{font-size:1.3rem;margin-top:10px}.audienceCard p{margin-bottom:18px}:global(.audienceCard a){color:#69d8ff;text-decoration:none;font-size:.78rem;font-weight:900}
      .fit{padding-bottom:90px}.fit ul{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:12px 30px;max-width:1000px}.fit li{color:#c7d7e2;line-height:1.5;padding-left:25px;position:relative}.fit li:before{content:'✓';position:absolute;left:0;color:#5ee6a8;font-weight:900}
      .closing{max-width:1000px;margin:0 auto;padding:28px 24px 110px;text-align:center}.closing p{max-width:700px;margin:0 auto 28px}.closingActions{justify-content:center}
      @media(max-width:900px){.valueGrid{grid-template-columns:1fr 1fr}.flowGrid,.industryGrid,.capGrid{grid-template-columns:1fr 1fr}.audienceGrid{grid-template-columns:1fr}.experience,.easyInstallTop{grid-template-columns:1fr}.fit ul{grid-template-columns:1fr}.proofRow{grid-template-columns:1fr;gap:5px}.installHighlights{grid-template-columns:1fr}}
      @media(max-width:600px){.hero{padding-top:58px}.valueGrid,.flowGrid,.industryGrid,.capGrid{grid-template-columns:1fr}.ctaRow,.closingActions,.experienceActions{align-items:stretch}.callCta,:global(.buyerCta){width:100%;align-items:center;text-align:center}.experience,.easyInstall{margin-left:18px;margin-right:18px;padding:26px 20px}.installFlow{align-items:stretch;flex-direction:column}.installFlow span{transform:rotate(90deg)}.heroInstall{line-height:1.6}}
    `}</style>
  </>;
}