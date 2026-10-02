import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PHONE_DISPLAY = '(725) 330-5102';
const PHONE_TEL = 'tel:+17253305102';
const SERVICE_NAME = 'Sales Service System';
const PLATFORM_NAME = 'Customer Engagement Operations Center';
const DESCRIPTION = 'Keep your sales operation open 24/7 with the Sales Service System, supported by the Customer Engagement Operations Center. Transparent usage-based pricing from Apropos Group LLC. Keep Your Number. Add The Intelligence.';

const FLOW = [
  { title: 'Your prospect contacts your business', body: 'A sales inquiry arrives during business hours, after hours, or while your team is helping someone else.' },
  { title: 'The Intelligent Sales Agent engages', body: 'The conversation follows the sales process and engagement rules configured for your business.' },
  { title: 'Approved sales questions are answered', body: 'Prospects receive information about your products, services, service areas, and approved pricing.' },
  { title: 'The opportunity is qualified', body: 'The agent collects relevant details and applies your qualification criteria before human follow-up.' },
  { title: 'The appropriate next step is captured', body: 'Depending on your configuration: an appointment request, consultation request, estimate intake, qualified lead, or human escalation.' },
];

const PAIN_POINTS = [
  'A prospect calls after closing',
  'Your sales team is unavailable',
  'Employees are helping other customers',
  'Several inquiries arrive at once',
  'A buyer needs answers before deciding',
  'An opportunity waits in voicemail',
];

const SALES_CAPABILITIES = [
  { title: '24/7 sales availability', body: 'Engage incoming prospects during business hours, after closing, and while your team is helping other customers.' },
  { title: 'Business-specific knowledge', body: 'Represent your products, services, service areas, policies, promotions, and approved sales procedures.' },
  { title: 'Product and service questions', body: 'Answer questions using the information and pricing your business approves during onboarding.' },
  { title: 'Needs discovery and qualification', body: 'Understand the prospect\'s needs, collect relevant details, and apply your qualification criteria.' },
  { title: 'Approved objection responses', body: 'Address common concerns using approved responses and involve your team when the conversation needs a person.' },
  { title: 'Estimate and quote intake', body: 'Capture the requirements and contact details your team needs to prepare an estimate or quote.' },
  { title: 'Appointment and consultation requests', body: 'Collect preferred times and request details for your team to confirm the appointment, consultation, inspection, or demonstration.' },
  { title: 'Configured human handoffs', body: 'Escalate to your people according to the transfer destinations, availability, and fallback rules established during onboarding.' },
  { title: 'Concurrent inquiry handling', body: 'Support multiple incoming sales conversations according to your configured service capacity and usage.' },
];

const OPERATIONS_CAPABILITIES = [
  { title: 'Customer 360 profiles', body: 'Keep customer and prospect information connected with recorded engagement and follow-up context.' },
  { title: 'Conversation history', body: 'Review captured interactions and available transcripts so the next conversation can build on the last.' },
  { title: 'Lead and opportunity management', body: 'Organize captured leads, track pipeline stages, and maintain the details your team needs to advance an opportunity.' },
  { title: 'Activities and follow-up tasks', body: 'Record sales activity, assign tasks, and track the follow-up work that needs staff attention.' },
  { title: 'Configured communications', body: 'Text follow-up and email or text notifications follow the recipients and rules established during onboarding.' },
  { title: 'Conversation intelligence and review', body: 'Use available analytics, transcript review, and quality scoring to understand engagement and refine your sales process.' },
];

const STAFF_CAPABILITIES = [
  { title: 'Track prospects and customers', body: 'Authorized staff access the leads, customer records, and sales activity available to their role.' },
  { title: 'Review Sales Agent activity', body: 'See captured interaction details and available transcripts before continuing the conversation.' },
  { title: 'Manage follow-up', body: 'Create and update assigned tasks, record activity, and keep the next action connected to the opportunity.' },
  { title: 'Receive engagement notifications', body: 'Email or text notifications can reach the staff designated during onboarding, according to your configured rules.' },
  { title: 'Maintain conversation continuity', body: 'Use the customer record and prior engagement context to support informed human follow-up.' },
  { title: 'Continue the human conversation', body: 'Handle configured transfers or follow up with prospects whose needs require a member of your team.' },
];

const LIFECYCLE = [
  { title: 'Inquiry and engagement', body: 'A prospect contacts your business. Your Intelligent Sales Agent engages and answers approved questions.' },
  { title: 'Discovery and qualification', body: 'The agent captures the prospect\'s needs, contact details, and relevant qualification information.' },
  { title: 'Connected opportunity record', body: 'Captured information becomes a lead and engagement record in your Customer Engagement Operations Center.' },
  { title: 'Staff visibility and follow-up', body: 'Authorized staff review the record and follow up. Configured notifications and text follow-up support the process where applicable.' },
  { title: 'The appropriate sales action', body: 'Your team confirms an appointment or consultation, prepares an estimate, or continues the conversation as needed.' },
  { title: 'An ongoing customer relationship', body: 'When a prospect becomes a customer, the record supports continued engagement, follow-up, retention activity, and future sales opportunities.' },
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
  { href: '/platform/flow-authoring', eyebrow: 'SALES CONVERSATION DESIGN', title: 'A conversation configured around your sales process', body: 'Your approved business knowledge, responses, and escalation rules guide how the agent engages prospects.' },
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
      <title>Sales Service System | 24/7 Sales | StellarUC</title>
      <meta name="description" content={DESCRIPTION} />
      <link rel="canonical" href="https://stellaruc.com/" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://stellaruc.com/" />
      <meta property="og:site_name" content="StellarUC" />
      <meta property="og:title" content="Sales Service System | Your Sales Operation Open 24/7" />
      <meta property="og:description" content={DESCRIPTION} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Sales Service System | 24/7 Sales" />
      <meta name="twitter:description" content={DESCRIPTION} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
    </Head>
    <Header publicProductName={SERVICE_NAME} />
    <main className="page salesHome">
      <section className="hero" aria-labelledby="hero-platform">
        <h1 id="hero-platform">{PLATFORM_NAME.toUpperCase()}</h1>
        <h2 className="heroService">{SERVICE_NAME.toUpperCase()}</h2>
        <p id="sales-headline" className="salesHeadline">WHEN YOUR BUSINESS CLOSES,<br /><span>YOUR SALES OPERATION REMAINS OPEN 24/7.</span></p>
        <p className="heroLead">An around-the-clock Sales Service System that engages inbound opportunities, supports concurrent conversations, qualifies prospects, and keeps your sales operation available when your team cannot be.</p>
        <p className="heroKicker">EVERY CALL ANSWERED · MULTIPLE CALLS AT ONCE · AROUND-THE-CLOCK SALES COVERAGE</p>
        <div className="ctaRow">
          <Link href="/demo" className="buyerCta">Experience the Demo — Talk to StellarUC →</Link>
          <a href="/business-estimate" className="buyerCta">Calculate Your Business Estimate →</a>
          <a href={PHONE_TEL} className="callCta">
            <span className="callLabel">Call the live demo line</span>
            <span className="callNumber">{PHONE_DISPLAY}</span>
          </a>
        </div>
        <p className="livePrompt">Keep Your Number. Add The Intelligence.</p>
      </section>

      <section id="operations-center" className="platformStory" aria-labelledby="operations-title">
        <div className="sectionHead">
          <small>THE CONNECTED CUSTOMER LIFECYCLE</small>
          <h2 id="operations-title">{PLATFORM_NAME}</h2>
          <p>Behind the Sales Service System, the Customer Engagement Operations Center connects the Sales Agent, your staff, and the customer relationship. Customer records, conversation history, pipeline activity, and follow-up help your team continue engagement from the first inquiry onward.</p>
        </div>
        <div className="industryGrid">{OPERATIONS_CAPABILITIES.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
        <div className="capGrid">
          {PLATFORM_PAGES.map(p => <Link href={p.href} className="capCard" key={p.href}><small>{p.eyebrow}</small><h3>{p.title}</h3><p>{p.body}</p><span>Explore →</span></Link>)}
          <Link href="/platform" className="buyerCta">Explore the Complete StellarUC Platform →</Link>
        </div>
      </section>

      <section className="painSection">
        <div className="sectionHead">
          <small>SALES OPPORTUNITIES DO NOT FOLLOW BUSINESS HOURS</small>
          <h2>Be ready when your next prospect <span>is ready.</span></h2>
          <p>A sales inquiry can arrive when your doors are closed, your sales team is unavailable, or several people need answers at once. The Sales Service System gives prospective customers a way to keep the conversation moving.</p>
        </div>
        <div className="painGrid">{PAIN_POINTS.map(item => <div className="painItem" key={item}>{item}</div>)}</div>
        <div className="painClose">ONE BUSINESS FUNCTION: SALES. <strong>KEEP SALES OPPORTUNITIES MOVING.</strong></div>
      </section>

      <section id="how-it-works" className="journey">
        <div className="sectionHead">
          <small>ENGAGE · INFORM · QUALIFY · ADVANCE</small>
          <h2>A sales conversation with an appropriate next step.</h2>
          <p>From the first inquiry to an appointment request, a qualified lead, or sales-team follow-up, the process follows the rules configured for your business.</p>
        </div>
        <div className="flowGrid">
          {FLOW.map((item, i) => <div className="flowItem" key={item.title}><span>{String(i + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.body}</p></div>)}
        </div>
      </section>

      <section id="sales-agent" className="industries">
        <div className="sectionHead">
          <small>YOUR INTELLIGENT SALES AGENT</small>
          <h2>Configured around the business it represents.</h2>
          <p>The mission is sales. Your Intelligent Sales Agent uses your business knowledge and approved sales process to help prospects move forward. During onboarding, we configure what it can answer, how it qualifies opportunities, and when it should involve your people.</p>
        </div>
        <div className="industryGrid">{SALES_CAPABILITIES.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
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

      <section id="business-estimate" className="pricing industries" aria-labelledby="estimate-title">
        <div className="sectionHead">
          <small>MAKE THE ECONOMICS PERSONAL</small>
          <h2 id="estimate-title">How many additional jobs would cover your StellarUC service?</h2>
          <p>Using an example monthly service cost of $1,095, the break-even point depends on the gross profit your business earns from an additional completed job.</p>
        </div>
        <div className="roiTable" role="table" aria-label="Additional jobs needed to cover example StellarUC monthly service cost">
          <div className="roiRow roiHead" role="row"><span role="columnheader">Gross profit per additional job</span><span role="columnheader">Additional jobs to cover $1,095</span></div>
          {[['$250','5 jobs'],['$350','4 jobs'],['$500','3 jobs'],['$750','2 jobs'],['$1,000','2 jobs'],['$1,500','1 job'],['$2,500','1 job']].map(([profit,jobs]) => <div className="roiRow" role="row" key={profit}><span role="cell">{profit}</span><strong role="cell">{jobs}</strong></div>)}
        </div>
        <p className="estimateNote">This is break-even mathematics, not a guarantee of additional jobs, revenue, or savings. Your estimate depends on your actual usage and business economics.</p>
        <Link href="/business-estimate" className="buyerCta">Calculate Your Business Estimate →</Link>
      </section>

      <section id="pricing" className="pricing industries" aria-labelledby="pricing-title">
        <div className="sectionHead">
          <small>USAGE-BASED PRICING FROM APROPOS.</small>
          <h2 id="pricing-title">TRUST STARTS WITH THE PRICE.</h2>
          <p className="pricingPrinciple">ONLY PAY FOR YOUR MONTHLY USAGE</p>
          <p>Keep an intelligent sales presence available around the clock. Understand the expected cost before service begins, with a monthly bill based on actual service usage.</p>
        </div>
        <div className="industryGrid">{PRICING_STEPS.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
        <ul className="pricingPromises">
          <li>No hidden overage charges.</li>
          <li>No pricing surprises buried in the fine print.</li>
          <li>No long-term locked-in contracts.</li>
        </ul>
        <p className="pricingClose">TRANSPARENCY BEFORE SERVICE BEGINS. <strong>TRUST FROM DAY ONE.</strong></p>
        <a href="/business-estimate" className="buyerCta">Calculate Your Business Estimate →</a>
      </section>

      <section id="staff-workspace" className="industries" aria-labelledby="workspace-title">
        <div className="sectionHead">
          <small>YOUR STAFF. YOUR CUSTOMERS. ONE CONNECTED WORKSPACE.</small>
          <h2 id="workspace-title">Keep your people connected to the opportunity.</h2>
          <p>Authorized staff have a secure workspace with customer records, prospects, and activity relevant to their role. Available modules and access are configured for your business, keeping automated engagement connected to the people responsible for the next step.</p>
        </div>
        <div className="industryGrid">{STAFF_CAPABILITIES.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
      </section>

      <section className="industries">
        <div className="sectionHead">
          <small>WHERE AN INBOUND INQUIRY CAN BECOME REVENUE</small>
          <h2>Built for businesses with inbound sales opportunities.</h2>
          <p>Requests for quotes, estimates, appointments, inspections, consultations, and product information are strong signals. These are examples, not limits on the businesses the system can serve.</p>
        </div>
        <div className="industryGrid">{INDUSTRIES.map(item => <div className="industryCard" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
      </section>

      <section id="customer-lifecycle" className="journey" aria-labelledby="lifecycle-title">
        <div className="sectionHead">
          <small>ONE WORKSPACE. ONE CUSTOMER VIEW.</small>
          <h2 id="lifecycle-title">From the first inquiry to an ongoing relationship.</h2>
          <p>The Sales Agent begins the conversation. The Operations Center maintains the engagement record. Your staff handle the decisions and follow-up that need a person. Each opportunity follows the path appropriate to your customer and business.</p>
        </div>
        <ol className="lifecycleGrid">
          {LIFECYCLE.map((item, i) => <li className="flowItem" key={item.title}><span>{String(i + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.body}</p></li>)}
        </ol>
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
        <small>SALES SERVICE SYSTEM · APROPOS GROUP LLC</small>
        <h2>See how 24/7 sales engagement could work for your business.</h2>
        <p>An Intelligent Sales Agent configured around your business. Transparent Usage-Based Pricing. Keep Your Number. Add The Intelligence.</p>
        <div className="closingActions">
          <Link href="/demo" className="buyerCta">See How It Works →</Link>
          <a href={PHONE_TEL} className="callCta"><span className="callLabel">Call the live demo line</span><span className="callNumber">{PHONE_DISPLAY}</span></a>
        </div>
        <div className="partnerFoot">Technology provider, MSP, telecom or reseller? <Link href="/partners">Explore Partner &amp; White-Label Opportunities →</Link></div>
      </section>
    </main>
    <Footer serviceName={SERVICE_NAME} serviceDescription="24/7 sales engagement supported by the Customer Engagement Operations Center. Transparent usage-based pricing." />

    <style jsx>{`
      .page{color:var(--theme-text);background:var(--theme-canvas)}
      .hero,.painSection,.journey,.industries,.platformStory,.proof,.fit,.easyInstall{max-width:1240px;margin:0 auto;padding-left:24px;padding-right:24px}
      .hero{border-bottom:1px solid var(--theme-border)}
      :global(body .salesHome .hero){padding-top:48px!important;padding-bottom:40px!important}
      :global(body .salesHome .hero::before),:global(body .salesHome .closing::before){display:none}
      .sectionHead small,.experience small,.closing small,.easyInstall small{color:var(--theme-accent);font-size:.72rem;font-weight:700;letter-spacing:0;text-transform:uppercase;line-height:1.7;display:block}
      h1,h2,h3{font-family:var(--theme-display);font-weight:400;letter-spacing:0;color:var(--theme-text);overflow-wrap:break-word}
      :global(body .salesHome .hero h1){letter-spacing:0!important}
      h1{font-size:3.7rem;line-height:1.08;margin:0 0 12px;max-width:1160px;text-wrap:balance}
      .salesHeadline span,.painSection h2 span,.easyInstall h2 span{color:var(--theme-accent-light);font-style:italic}
      .heroService{color:var(--theme-accent-light);font-size:2.35rem;line-height:1.2;margin:0 0 18px}
      .salesHeadline{color:var(--theme-text);font-size:1.7rem;line-height:1.35;margin:0 0 18px;max-width:1000px;letter-spacing:0}
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
      .lifecycleGrid{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;padding:0;margin:2rem 0 0}
      .pricing{border-top:2px solid var(--theme-accent);border-bottom:2px solid var(--theme-accent)}
      .roiTable{max-width:860px;margin:2rem 0;border-top:1px solid var(--theme-border);border-bottom:1px solid var(--theme-border)}
      .roiRow{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1rem 1.2rem;border-bottom:1px solid var(--theme-border-soft);align-items:center}
      .roiRow:last-child{border-bottom:0}.roiRow strong{color:var(--theme-accent-light);font-family:var(--theme-display);font-size:1.2rem}
      .roiHead{color:var(--theme-accent);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
      .estimateNote{max-width:860px;color:var(--theme-secondary);line-height:1.7;margin:1rem 0 1.5rem}
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
      @media(max-width:850px){.painGrid,.industryGrid,.installHighlights{grid-template-columns:1fr}.capGrid,.flowGrid,.lifecycleGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.pricingPromises{grid-template-columns:1fr;gap:.5rem}.proofRow{grid-template-columns:1fr}.installFlow{display:grid;grid-template-columns:1fr}.installFlow span{transform:rotate(90deg);justify-self:start}}
      @media(max-width:600px){h1{font-size:2.15rem;line-height:1.12}.heroService{font-size:1.65rem;margin-bottom:14px}.salesHeadline{font-size:1.2rem;line-height:1.4;margin-bottom:14px}.heroLead{font-size:1rem}.heroKicker{font-size:.85rem}:global(body .salesHome .hero){padding-top:28px!important;padding-bottom:28px!important}.sectionHead h2,.easyInstall h2,.experience h2,.closing h2{font-size:2.15rem}.ctaRow,.closingActions,.experienceActions{flex-direction:column}.callCta,:global(.salesHome .buyerCta){width:100%;min-width:0;padding:.8rem 1rem}.capGrid,.flowGrid,.lifecycleGrid{grid-template-columns:1fr}.painSection,.journey,.industries,.platformStory,.proof,.fit,.easyInstall,.experience,.closing{padding-top:44px;padding-bottom:44px}}
      @media(max-width:360px){:global(body .salesHome .hero){padding:18px 18px 20px!important}.hero h1{font-size:1.65rem;line-height:1.12;margin:0 0 8px}.hero .heroService{font-size:1.35rem;margin-bottom:10px}.hero .salesHeadline{font-size:1.02rem;line-height:1.35;margin-bottom:14px}.hero .heroLead{font-size:.9rem;line-height:1.55;margin:12px 0}.hero .heroKicker{font-size:.73rem;margin:10px 0}.hero .ctaRow{gap:.6rem;margin-top:14px}.hero .callCta,:global(.salesHome .hero .buyerCta){padding:.5rem .8rem}.hero .callNumber{font-size:1.05rem}.hero .livePrompt{font-size:.83rem;margin:12px 0 0}}
    `}</style>
  </>;
}
