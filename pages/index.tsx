import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PHONE_DISPLAY = '(725) 330-5102';
const PHONE_TEL = 'tel:+17253305102';
const SERVICE_NAME = 'Intelligent Sales Service System';
const DESCRIPTION = 'Keep your sales operation open 24/7 with an Intelligent Sales Agent configured for your business. Transparent usage-based pricing from Apropos Group LLC. Keep Your Number. Add The Intelligence.';

const FLOW = [
  { title: 'Your prospect contacts your business', body: 'A sales inquiry arrives during business hours, after hours, or while your team is helping someone else.' },
  { title: 'The Intelligent Sales Agent engages', body: 'The conversation follows the sales process and engagement rules configured for your business.' },
  { title: 'Approved sales questions are answered', body: 'Prospects receive information about your products, services, service areas, and approved pricing.' },
  { title: 'The opportunity is qualified', body: 'The agent collects relevant details and applies your qualification criteria before human follow-up.' },
  { title: 'The appropriate next step is taken', body: 'Depending on your configuration: an appointment, consultation, estimate, inspection, demonstration, lead capture, or human escalation.' },
];

const PAIN_POINTS = [
  'A prospect calls after closing',
  'Your sales team is unavailable',
  'Employees are helping other customers',
  'Several inquiries arrive at once',
  'A buyer needs answers before deciding',
  'An opportunity waits in voicemail',
];

const KNOWLEDGE = [
  { title: 'Your products and services', body: 'Products, services, service areas, frequently asked questions, approved pricing, promotions, and financing information where applicable.' },
  { title: 'Your sales approach', body: 'Qualification criteria, common objections, approved objection responses, and the information your agent may communicate.' },
  { title: 'Your next steps and boundaries', body: 'Scheduling, estimate and consultation procedures, sales-process requirements, escalation rules, and situations requiring a person.' },
];

const BENEFITS = [
  { title: 'Sales availability beyond business hours', body: 'Give prospects a way to engage with your business at night, on weekends, and when your sales team is unavailable.' },
  { title: 'Engage prospects when they are ready', body: 'Answer approved sales questions while interest is active and help prospective customers find the appropriate next step.' },
  { title: 'Consistent sales conversations', body: 'Represent your business using the knowledge, qualification criteria, and sales rules you approve.' },
  { title: 'Qualify before human follow-up', body: 'Give your sales team relevant prospect details and context for the opportunities that need their attention.' },
  { title: 'Keep compatible communications', body: 'Add an intelligence layer around the business number and communications environment your customers already know.' },
  { title: 'Transparent, scalable sales engagement', body: 'Support inbound sales inquiries around the clock, with an estimated cost explained before service begins and monthly billing based on actual usage.' },
];

const PRICING_STEPS = [
  { title: 'You know what drives the cost.', body: 'Before service begins, Apropos reviews your historical incoming-call activity: number of calls, average call length, concurrent call volume, peak call periods, and overall usage patterns.' },
  { title: 'You understand the estimate.', body: 'Using that information, Apropos provides an estimated monthly service cost based on your expected business activity and explains how it is calculated.' },
  { title: 'Your bill follows actual usage.', body: 'Your monthly bill is based on that month\'s actual usage. You only pay for the service we provide.' },
];

const INDUSTRIES = [
  { title: 'Home and field services', body: 'HVAC, plumbing, roofing, restoration, electrical, remodeling, and other businesses receiving quote, estimate, inspection, and service inquiries.' },
  { title: 'Property and automotive businesses', body: 'Leasing inquiries, property consultations, automotive service inquiries, and appointment requests that can become sales opportunities.' },
  { title: 'Other inbound-sales-driven businesses', body: 'Contractors, commercial services, product providers, and any business where an inbound inquiry can become revenue.' },
];

const PLATFORM_PAGES = [
  { href: '/platform/flow-authoring', eyebrow: 'SALES CONVERSATION DESIGN', title: 'Configure the conversation around your sales process', body: 'Call flows, approved responses, simulation, and version history support how your business engages prospects.' },
  { href: '/platform/live-operations', eyebrow: 'SALES FOLLOW-UP', title: 'Carry the opportunity into your team\'s workspace', body: 'Lead Management, Activities, Tasks, and Customer 360 help your team continue the sales conversation.' },
  { href: '/platform/intelligence-qa', eyebrow: 'CONVERSATION REVIEW', title: 'Understand and refine sales engagement', body: 'Conversation analytics, transcript review, quality scoring, and coaching support ongoing improvement.' },
  { href: '/platform/governance-platform', eyebrow: 'PLATFORM CONTROLS', title: 'Support your approved sales rules', body: 'Access controls, flow management, and shared platform services support your configured environment.' },
];

const BUSINESS_FIT = [
  'Prospects call for a quote, estimate, pricing, or product information',
  'Appointments, consultations, inspections, or demonstrations move sales forward',
  'After-hours inquiries can become legitimate sales opportunities',
  'Your sales team needs context and qualification before following up',
  'You want intelligent sales engagement around compatible existing communications',
];

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: SERVICE_NAME,
  serviceType: '24/7 intelligent sales engagement',
  description: DESCRIPTION,
  url: 'https://stellaruc.com/',
  provider: { '@type': 'Organization', name: 'Apropos Group LLC', url: 'https://aproposgroupllc.com/' },
};

export default function HomePage() {
  return <>
    <Head>
      <title>Intelligent Sales Service System | 24/7 Sales | StellarUC</title>
      <meta name="description" content={DESCRIPTION} />
      <link rel="canonical" href="https://stellaruc.com/" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://stellaruc.com/" />
      <meta property="og:site_name" content="StellarUC" />
      <meta property="og:title" content="Intelligent Sales Service System | Your Sales Operation Open 24/7" />
      <meta property="og:description" content={DESCRIPTION} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Intelligent Sales Service System | 24/7 Sales" />
      <meta name="twitter:description" content={DESCRIPTION} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
    </Head>
    <Header publicProductName={SERVICE_NAME} />
    <main className="page salesHome">
      <section className="hero" aria-labelledby="sales-headline">
        <div className="eyebrow">STELLARUC · APROPOS GROUP LLC</div>
        <p className="serviceName">INTELLIGENT SALES SERVICE SYSTEM</p>
        <h1 id="sales-headline">YOUR BUSINESS MAY CLOSE.<br /><span>WHILE YOUR SALES OPERATION REMAINS OPEN 24/7.</span></h1>
        <p className="heroLead">Give your business an Intelligent Sales Agent configured to engage prospective customers, answer approved sales questions, qualify opportunities, and move prospects toward the appropriate next step around the clock.</p>
        <p className="heroKicker">24/7 SALES AVAILABILITY · USAGE-BASED PRICING</p>
        <div className="ctaRow">
          <Link href="/demo" className="buyerCta">See How It Works →</Link>
          <a href={PHONE_TEL} className="callCta">
            <span className="callLabel">Call the live demo line</span>
            <span className="callNumber">{PHONE_DISPLAY}</span>
          </a>
        </div>
        <p className="livePrompt">Keep Your Number. Add The Intelligence.</p>
      </section>

      <section className="painSection">
        <div className="sectionHead">
          <small>SALES OPPORTUNITIES DO NOT FOLLOW BUSINESS HOURS</small>
          <h2>Be ready when your next prospect <span>is ready.</span></h2>
          <p>A sales inquiry can arrive when your doors are closed, your sales team is unavailable, or several people need answers at once. The Intelligent Sales Service System gives prospective customers a way to keep the conversation moving.</p>
        </div>
        <div className="painGrid">{PAIN_POINTS.map(item => <div className="painItem" key={item}>{item}</div>)}</div>
        <div className="painClose">ONE BUSINESS FUNCTION: SALES. <strong>KEEP SALES OPPORTUNITIES MOVING.</strong></div>
      </section>

      <section id="how-it-works" className="journey">
        <div className="sectionHead">
          <small>ENGAGE · INFORM · QUALIFY · ADVANCE</small>
          <h2>A sales conversation with an appropriate next step.</h2>
          <p>From the first inquiry to an appointment, a qualified lead, or sales-team follow-up, the process follows the rules configured for your business.</p>
        </div>
        <div className="flowGrid">
          {FLOW.map((item, i) => <div className="flowItem" key={item.title}><span>{String(i + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.body}</p></div>)}
        </div>
      </section>

      <section id="sales-agent" className="industries">
        <div className="sectionHead">
          <small>YOUR INTELLIGENT SALES AGENT</small>
          <h2>Configured around the business it represents.</h2>
          <p>More than a generic answering bot, your Intelligent Sales Agent is trained around your business knowledge and approved sales process. During onboarding, we configure what it can answer, how it qualifies prospects, and when it should involve your people.</p>
        </div>
        <div className="industryGrid">{KNOWLEDGE.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
      </section>

      <section className="easyInstall">
        <small>AN INTELLIGENCE LAYER FOR YOUR SALES OPERATION</small>
        <h2>Keep Your Number. <span>Add The Intelligence.</span></h2>
        <p>Preserve the business number and communications infrastructure you already use where technically compatible. Apropos configures intelligent sales engagement around that environment, helping you add 24/7 availability with less disruption.</p>
        <div className="installFlow">
          <b>YOUR EXISTING NUMBER</b><span aria-hidden="true">→</span><b>COMPATIBLE CALL FORWARDING</b><span aria-hidden="true">→</span><b>YOUR INTELLIGENT SALES AGENT</b><span aria-hidden="true">→</span><b>THE APPROPRIATE NEXT STEP</b>
        </div>
        <div className="installHighlights">
          <div><strong>KEEP WHAT WORKS</strong><p>We review compatibility with your existing communications environment during onboarding.</p></div>
          <div><strong>ADD BUSINESS-SPECIFIC ENGAGEMENT</strong><p>Your products, services, qualification criteria, approved answers, and escalation rules guide the conversation.</p></div>
          <div><strong>KEEP YOUR TEAM INVOLVED</strong><p>Human escalation and sales-team follow-up remain part of the process when your configuration calls for them.</p></div>
        </div>
      </section>

      <section id="pricing" className="pricing industries" aria-labelledby="pricing-title">
        <div className="sectionHead">
          <small>USAGE-BASED PRICING FROM APROPOS.</small>
          <h2 id="pricing-title">TRUST STARTS WITH THE PRICE.</h2>
          <p className="pricingPrinciple">YOU ONLY PAY FOR THE SERVICE WE PROVIDE.</p>
          <p>Keep an intelligent sales presence available around the clock. Understand the expected cost before service begins, with a monthly bill based on actual service usage.</p>
        </div>
        <div className="industryGrid">{PRICING_STEPS.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
        <ul className="pricingPromises">
          <li>No hidden overage charges.</li>
          <li>No pricing surprises buried in the fine print.</li>
          <li>No long-term locked-in contracts.</li>
        </ul>
        <p className="pricingClose">TRANSPARENCY BEFORE SERVICE BEGINS. <strong>TRUST FROM DAY ONE.</strong></p>
        <Link href="/demo" className="buyerCta">Explore 24/7 Sales →</Link>
      </section>

      <section className="industries">
        <div className="sectionHead">
          <small>24/7 AVAILABILITY. BUSINESS-SPECIFIC ENGAGEMENT.</small>
          <h2>Keep legitimate sales opportunities moving.</h2>
          <p>Extend your sales presence beyond normal hours while keeping your people focused on the opportunities and decisions that need them.</p>
        </div>
        <div className="industryGrid">{BENEFITS.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
      </section>

      <section className="industries">
        <div className="sectionHead">
          <small>WHERE AN INBOUND INQUIRY CAN BECOME REVENUE</small>
          <h2>Built for businesses with inbound sales opportunities.</h2>
          <p>Requests for quotes, estimates, appointments, inspections, consultations, and product information are strong signals. These are examples, not limits on the businesses the system can serve.</p>
        </div>
        <div className="industryGrid">{INDUSTRIES.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
      </section>

      <section className="platformStory">
        <div className="sectionHead">
          <small>THE UNDERLYING PLATFORM</small>
          <h2>Intelligent Customer Engagement Operation Center</h2>
          <p>The underlying subscribed platform supports the Intelligent Sales Service System. Its conversation tools, lead management, workspace, and review capabilities serve one primary business function here: sales.</p>
        </div>
        <div className="capGrid">
          {PLATFORM_PAGES.map(p => <Link href={p.href} className="capCard" key={p.href}><small>{p.eyebrow}</small><h3>{p.title}</h3><p>{p.body}</p><span>Explore →</span></Link>)}
        </div>
      </section>

      <section className="experience">
        <div>
          <small>LIVE DEMONSTRATION LINE</small>
          <h2>Experience an intelligent sales conversation.</h2>
          <p>Call the existing demonstration line to speak with the sales agent, then visit the demo to see how your conversation becomes a captured lead for follow-up.</p>
        </div>
        <div className="experienceActions">
          <a href={PHONE_TEL} className="callCta"><span className="callLabel">Call the live demo line</span><span className="callNumber">{PHONE_DISPLAY}</span></a>
          <Link href="/demo" className="buyerCta">See How It Works →</Link>
        </div>
      </section>

      <section id="proof" className="proof">
        <div className="sectionHead">
          <small>FROM SALES INQUIRY TO CAPTURED OPPORTUNITY</small>
          <h2>Give your sales team a conversation to continue.</h2>
          <p>This anonymized example illustrates how an inquiry becomes a structured lead. The existing demonstration lets you see the lead captured from your own call.</p>
        </div>
        <div className="proofCard">
          <div className="proofRow"><span>Caller</span><b>Jordan Reyes</b></div>
          <div className="proofRow"><span>Business</span><b>Acme Fabrication</b></div>
          <div className="proofRow"><span>Sales inquiry</span><b>Asked about a customer intake and CRM solution for growing order volume.</b></div>
          <div className="proofRow"><span>Next step</span><b>Structured lead created · pipeline stage: New</b></div>
        </div>
      </section>

      <section className="fit">
        <div className="sectionHead"><small>IS THIS RIGHT FOR YOUR BUSINESS?</small><h2>Start with the sales inquiries you already receive.</h2></div>
        <ul>{BUSINESS_FIT.map(item => <li key={item}>{item}</li>)}</ul>
      </section>

      <section id="stellar-review" className="closing">
        <small>INTELLIGENT SALES SERVICE SYSTEM · APROPOS GROUP LLC</small>
        <h2>See how 24/7 sales engagement could work for your business.</h2>
        <p>An Intelligent Sales Agent configured around your business. Transparent Usage-Based Pricing. Keep Your Number. Add The Intelligence.</p>
        <div className="closingActions">
          <Link href="/demo" className="buyerCta">See How It Works →</Link>
          <a href={PHONE_TEL} className="callCta"><span className="callLabel">Call the live demo line</span><span className="callNumber">{PHONE_DISPLAY}</span></a>
        </div>
        <div className="partnerFoot">Technology provider, MSP, telecom or reseller? <Link href="/partners">Explore Partner &amp; White-Label Opportunities →</Link></div>
      </section>
    </main>
    <Footer serviceName={SERVICE_NAME} serviceDescription="24/7 intelligent sales engagement with transparent usage-based pricing." />

    <style jsx>{`
      .page{color:var(--theme-text);background:var(--theme-canvas)}
      .hero,.painSection,.journey,.industries,.platformStory,.proof,.fit,.easyInstall{max-width:1240px;margin:0 auto;padding-left:24px;padding-right:24px}
      .hero{border-bottom:1px solid var(--theme-border)}
      :global(body .salesHome .hero){padding-top:48px!important;padding-bottom:40px!important}
      :global(body .salesHome .hero::before),:global(body .salesHome .closing::before){display:none}
      .eyebrow,.sectionHead small,.experience small,.closing small,.easyInstall small{color:var(--theme-accent);font-size:.72rem;font-weight:700;letter-spacing:0;text-transform:uppercase;line-height:1.7;display:block}
      h1,h2,h3{font-family:var(--theme-display);font-weight:400;letter-spacing:0;color:var(--theme-text);overflow-wrap:break-word}
      :global(body .salesHome .hero h1){letter-spacing:0!important}
      h1{font-size:3.7rem;line-height:1.08;margin:16px 0 20px;max-width:1160px}
      h1 span,.painSection h2 span,.easyInstall h2 span{color:var(--theme-accent-light);font-style:italic}
      .serviceName{color:var(--theme-accent-light);font-size:1.1rem;font-weight:700;line-height:1.5;margin:12px 0}
      .heroKicker{color:var(--theme-accent-light);font-weight:700;letter-spacing:0;line-height:1.6}
      .heroLead,.sectionHead p,.easyInstall p,.industryCard p,.capCard p,.experience p,.closing p,.flowItem p{color:var(--theme-secondary);line-height:1.75}
      .heroLead{max-width:930px;font-size:1.05rem}
      .painClose{border-left:4px solid var(--theme-accent);padding:1rem 1.3rem;margin-top:1.4rem;color:var(--theme-accent-light);line-height:1.7}
      .ctaRow,.closingActions,.experienceActions{display:flex;gap:.8rem;flex-wrap:wrap;align-items:stretch;margin-top:1.5rem}
      .callCta,:global(.salesHome .buyerCta){display:inline-flex;flex-direction:column;justify-content:center;border:1px solid var(--theme-accent);border-radius:0;padding:1rem 1.35rem;text-decoration:none;font-weight:700;letter-spacing:0;text-transform:uppercase;line-height:1.5;overflow-wrap:anywhere}
      .callCta{background:var(--theme-accent);color:#090909;min-width:250px}:global(.salesHome .buyerCta){background:transparent;color:var(--theme-accent-light)}
      .callLabel{display:block;font-size:.64rem}.callNumber{display:block;font-family:var(--theme-display);font-size:1.28rem;letter-spacing:0;margin-top:.25rem}
      .livePrompt{color:var(--theme-accent-light);margin-top:1rem;line-height:1.6}
      .painSection,.journey,.industries,.platformStory,.proof,.fit,.easyInstall{padding-top:64px;padding-bottom:64px}
      .sectionHead h2,.easyInstall h2,.experience h2,.closing h2{font-size:3rem;line-height:1.15;margin:.5rem 0 1rem;max-width:1000px}
      .painGrid,.industryGrid,.capGrid,.installHighlights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin-top:2rem}
      .painItem,.industryCard,:global(.salesHome .capCard),.installHighlights>div,.proofCard{background:var(--theme-surface);border:1px solid var(--theme-border-soft);border-top:3px solid var(--theme-accent);padding:1.5rem;min-width:0;color:var(--theme-text);overflow-wrap:anywhere}
      .painItem{color:var(--theme-accent-light);font-size:1.05rem;line-height:1.6}
      .industryCard h3,:global(.salesHome .capCard) h3{font-size:1.45rem;line-height:1.3;color:var(--theme-accent-light);margin-top:0}
      :global(.salesHome .capCard){text-decoration:none}:global(.salesHome .capCard) span{color:var(--theme-accent-light)}:global(.salesHome .capCard) small{color:var(--theme-accent);letter-spacing:0;font-size:.68rem;line-height:1.7}
      .capGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .installFlow{display:flex;gap:.7rem;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:2rem 0;padding:1.2rem;border-top:1px solid var(--theme-border);border-bottom:1px solid var(--theme-border);line-height:1.6}.installFlow b{font-size:.82rem}.installFlow span{color:var(--theme-accent)}
      .flowGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1rem;margin-top:2rem}.flowItem{background:var(--theme-surface);border-top:3px solid var(--theme-accent);padding:1.25rem;min-width:0}.flowItem span{display:block;color:var(--theme-accent);font-size:.7rem;margin-bottom:.65rem}.flowItem h3{font-size:1.35rem;line-height:1.3;margin:0}.flowItem p{font-size:.9rem;margin-bottom:0}
      .pricing{border-top:2px solid var(--theme-accent);border-bottom:2px solid var(--theme-accent)}
      .sectionHead .pricingPrinciple{color:var(--theme-accent-light);font-size:1.25rem;font-weight:700;line-height:1.6}
      .pricingPromises{list-style:none;padding:0;margin:2rem 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.5rem;color:var(--theme-accent-light);font-size:1.05rem;font-weight:700;line-height:1.65}.pricingPromises li{padding:.85rem 0;border-top:1px solid var(--theme-border)}
      .pricingClose{line-height:1.7;color:var(--theme-secondary);margin:1.5rem 0}.pricingClose strong{color:var(--theme-accent-light)}
      .experience,.closing{border-top:1px solid var(--theme-border);border-bottom:1px solid var(--theme-border);padding:64px max(24px,calc((100% - 1192px)/2))}
      .experience{display:flex;justify-content:space-between;gap:2rem;align-items:center}.experience>div:first-child{max-width:760px}.experienceActions{flex-shrink:0;flex-direction:column}
      .proofRow{display:grid;grid-template-columns:170px 1fr;gap:1rem;padding:.9rem 0;border-bottom:1px solid var(--theme-border-soft);line-height:1.6}.proofRow:last-child{border-bottom:0}.proofRow span{color:var(--theme-accent-light);text-transform:uppercase;font-size:.72rem;letter-spacing:0}
      .fit ul{list-style:none;padding:0;margin:2rem 0 0}.fit li{padding:1rem 0;border-bottom:1px solid var(--theme-border-soft);line-height:1.7}
      .closing{text-align:left}.closing>*{max-width:1192px}.partnerFoot{margin-top:2rem;color:var(--theme-secondary);line-height:1.7}.partnerFoot a{color:var(--theme-accent-light)}
      :global(body .salesHome .closing p){color:var(--theme-secondary)!important}
      @media(max-width:1000px){h1{font-size:3.2rem}.flowGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.experience{display:block}.experienceActions{flex-direction:row;flex-wrap:wrap}}
      @media(max-width:850px){.painGrid,.industryGrid,.installHighlights{grid-template-columns:1fr}.capGrid,.flowGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.pricingPromises{grid-template-columns:1fr;gap:.5rem}.proofRow{grid-template-columns:1fr}.installFlow{display:grid;grid-template-columns:1fr}.installFlow span{transform:rotate(90deg);justify-self:start}}
      @media(max-width:600px){h1{font-size:2.15rem;line-height:1.12}.serviceName{font-size:.95rem}.heroLead{font-size:1rem}.heroKicker{font-size:.85rem}.eyebrow{font-size:.65rem}:global(body .salesHome .hero){padding-top:28px!important;padding-bottom:28px!important}.sectionHead h2,.easyInstall h2,.experience h2,.closing h2{font-size:2.15rem}.ctaRow,.closingActions,.experienceActions{flex-direction:column}.callCta,:global(.salesHome .buyerCta){width:100%;min-width:0;padding:.8rem 1rem}.capGrid,.flowGrid{grid-template-columns:1fr}.painSection,.journey,.industries,.platformStory,.proof,.fit,.easyInstall,.experience,.closing{padding-top:44px;padding-bottom:44px}}
    `}</style>
  </>;
}
