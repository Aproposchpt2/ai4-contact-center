import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PHONE_DISPLAY = '(725) 330-5102';
const PHONE_TEL = 'tel:+17253305102';

type Section = {
  n: string;
  eyebrow: string;
  title: string;
  body: string;
  link?: { href: string; label: string };
  roadmap?: boolean;
};

const SECTIONS: Section[] = [
  {
    n: '01',
    eyebrow: 'POSITIONING',
    title: 'A system authority, not a chatbot',
    body: 'AI4CC is a developed, production-deployed contact-center platform. The core system stays authoritative for customer identity, interactions, routing, CRM workflow, tasks and audit evidence — conversational AI sits at the voice layer as an enhancement, not the source of truth.',
  },
  {
    n: '02',
    eyebrow: 'CHANNEL ARCHITECTURE',
    title: 'Voice, SMS and Web Chat — one platform',
    body: 'Dedicated operational surfaces for each channel, tied to canonical interaction, routing, queue and agent authorities. Not three bolted-together tools — one control plane underneath all of it.',
    link: { href: '/channels', label: 'Open Channel Operations' },
  },
  {
    n: '03',
    eyebrow: 'LEAD MANAGEMENT',
    title: 'The commercial workflow',
    body: 'Lead lifecycle, ownership, priority, value and probability, next actions, and progression through the pipeline — the operator surface a real sales team runs on, not a placeholder CRM screen.',
    link: { href: '/lead-management', label: 'Open Lead Management' },
  },
  {
    n: '04',
    eyebrow: 'ACTIVITIES + TASKS',
    title: 'Follow-through, not just capture',
    body: 'Every lead carries a canonical Activity and Task workflow — follow-ups, completion state, ownership — so a captured lead has a built-in path to a closed deal instead of going cold in a spreadsheet.',
    link: { href: '/lead-operations', label: 'Open Lead Operations' },
  },
  {
    n: '05',
    eyebrow: 'CUSTOMER 360',
    title: 'One unified view of every contact',
    body: 'Contact, interaction history, linked leads, tasks, activities and channel counts brought together in a single operational view — the record a support or sales agent actually needs mid-conversation.',
    link: { href: '/customer-360', label: 'Open Customer 360' },
  },
  {
    n: '06',
    eyebrow: 'CONVERSATIONAL AI POSITION',
    title: 'Proven end to end — call it yourself',
    body: `The AI4CC Business Intake Agent answers real inbound calls, runs a structured voice interview, and hands the result to the platform's own webhook — which creates the lead. Owner-tested end to end, live, on a real phone number. Call ${PHONE_DISPLAY} and watch it happen.`,
    link: { href: PHONE_TEL, label: `Call ${PHONE_DISPLAY}` },
  },
  {
    n: '07',
    eyebrow: 'SAAS EXPANSION',
    title: 'Where a buyer takes this next',
    body: 'Multi-tenant packaging with self-serve provisioning, usage metering and subscription billing, packaged voice-agent products (AI Receptionist, Lead Qualification Agent, After-Hours Agent), and white-label or vertical-specific deployments.',
    roadmap: true,
  },
  {
    n: '08',
    eyebrow: 'ACQUISITION',
    title: 'A technology asset, priced on what was built',
    body: 'AI4CC is pre-revenue and offered as a full technology-asset sale — documented development cost, production deployment history, and a clear commercialization path, not a revenue multiple. Full technical diligence (repository, schema, deployment model, security controls, known-issues register) is available under NDA.',
  },
];

export default function AcquisitionPage() {
  return <>
    <Head>
      <title>AI4CC — Buyer Walkthrough</title>
      <meta name="description" content="A self-guided walkthrough of AI4 Intelligent Contact Center for prospective buyers and white-label partners — architecture, live product surfaces, and the proven Conversational AI Agent." />
      <meta name="robots" content="noindex" />
    </Head>
    <Header />
    <main className="page">
      <section className="intro">
        <div className="eyebrow">FOR BUYERS &amp; WHITE-LABEL PARTNERS</div>
        <h1>Walk through AI4CC the way a diligence call would.</h1>
        <p>Eight sections, same order as the acquisition demo script — each one links straight to the live
          surface so you can click through yourself instead of taking a screenshot&apos;s word for it.</p>
        <a href={PHONE_TEL} className="callCta">
          <span className="callLabel">Skip ahead — call it now</span>
          <span className="callNumber">{PHONE_DISPLAY}</span>
        </a>
      </section>

      <section className="sections">
        {SECTIONS.map(s => (
          <div className="sectionCard" key={s.n}>
            <div className="sectionMeta">
              <span className="sectionN">{s.n}</span>
              <span className="sectionEyebrow">{s.eyebrow}{s.roadmap && <em className="roadmapTag">ROADMAP</em>}</span>
            </div>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
            {s.link && (
              <a href={s.link.href} className="sectionLink">{s.link.label} →</a>
            )}
          </div>
        ))}
      </section>

      <section className="closing">
        <h2>Ready to talk?</h2>
        <p>Full technical diligence — repository, schema, deployment model, security posture, known-issues
          register and cost basis — is available under NDA via the Acquire.com listing.</p>
        <Link href="/" className="ghostCta">← Back to the platform overview</Link>
      </section>
    </main>
    <Footer />

    <style jsx>{`
      :global(*){box-sizing:border-box}
      :global(body){margin:0;background:#06111f}
      .page{color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);}

      .intro{max-width:900px;margin:0 auto;padding:80px 24px 50px}
      .eyebrow{color:#718ba0;font-size:.65rem;font-weight:900;letter-spacing:.16em}
      h1{font-size:clamp(2.1rem,4.6vw,3.1rem);line-height:1.08;letter-spacing:-.03em;margin:16px 0 18px}
      .intro p{color:#9eb3c4;line-height:1.7;font-size:1rem;max-width:640px;margin:0 0 30px}

      .callCta{display:inline-flex;flex-direction:column;gap:2px;text-decoration:none;background:#69d8ff;color:#06111f;padding:14px 24px;border-radius:12px;box-shadow:0 0 0 1px rgba(105,216,255,.4), 0 18px 40px -12px rgba(105,216,255,.45);}
      .callLabel{font-size:.62rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;opacity:.75}
      .callNumber{font-size:1.25rem;font-weight:900;letter-spacing:-.01em}

      .sections{max-width:900px;margin:0 auto;padding:10px 24px 60px;display:grid;gap:18px}
      .sectionCard{border:1px solid #19384d;border-radius:16px;background:rgba(7,24,38,.72);padding:30px}
      .sectionMeta{display:flex;align-items:center;gap:12px;margin-bottom:14px}
      .sectionN{color:#3f5b70;font-size:.7rem;font-weight:900;letter-spacing:.12em}
      .sectionEyebrow{color:#69d8ff;font-size:.65rem;font-weight:900;letter-spacing:.14em;display:flex;align-items:center;gap:10px}
      .roadmapTag{background:rgba(105,216,255,.12);color:#69d8ff;border-radius:999px;padding:3px 9px;font-size:.6rem;font-style:normal;letter-spacing:.1em}
      .sectionCard h2{margin:0 0 12px;font-size:1.35rem;letter-spacing:-.01em}
      .sectionCard p{margin:0 0 16px;color:#a9bcc9;font-size:.9rem;line-height:1.65;max-width:680px}
      .sectionLink{color:#69d8ff;text-decoration:none;font-size:.82rem;font-weight:800}
      .sectionLink:hover{text-decoration:underline}

      .closing{max-width:700px;margin:0 auto;padding:24px 24px 110px;text-align:center}
      .closing h2{font-size:1.5rem;margin:0 0 12px;letter-spacing:-.02em}
      .closing p{color:#8ea2b3;line-height:1.7;font-size:.9rem;margin:0 0 26px}
      .ghostCta{color:#c7dbe8;text-decoration:none;font-size:.85rem;font-weight:700;border-bottom:1px solid rgba(255,255,255,.25);padding-bottom:2px}
      .ghostCta:hover{border-color:#69d8ff;color:#69d8ff}
    `}</style>
  </>;
}
