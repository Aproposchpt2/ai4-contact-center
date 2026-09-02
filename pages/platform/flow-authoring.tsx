import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ITEMS = [
  {
    title: 'AI Script Builder',
    body: `Describe a call flow in plain English — "Main menu: 1 for Admissions, 2 for Financial Aid, 3 for IT
      Helpdesk. After hours send to voicemail. Holidays play a special message." — and the builder turns it into
      structured, working IVR logic instantly. This is the difference between hiring someone to configure a
      phone tree in a legacy PBX admin panel for a day, and describing what you want in a sentence.`,
    link: { href: '/builder', label: 'Open the Script Builder' },
  },
  {
    title: 'Visual Flow Designer',
    body: `A node-based canvas for building and editing call flows by hand — Menu, Option, Queue, Prompt,
      After-Hours and Holiday nodes, connected visually. Every flow supports full JSON import/export, so logic
      built here is portable, versionable, and reviewable outside the UI too — not locked into a proprietary
      black box.`,
    link: { href: '/designer', label: 'Open the Designer' },
  },
  {
    title: 'Simulation, Auto-Repair & Versioning',
    body: `A flow doesn't have to go live to be tested — the Flow Simulator walks through a call step by step
      before anyone dials in. Flow Auto-Repair detects broken references and structural problems and fixes
      them automatically. Flow Versioning keeps a full history with rollback, so a bad deploy is a click away
      from being undone, not an incident.`,
    link: { href: '/flow-simulator', label: 'Open the Simulator' },
  },
];

export default function FlowAuthoringPage() {
  return <>
    <Head>
      <title>Flow Authoring — AI4 Contact Center</title>
      <meta name="description" content="How AI4 Contact Center lets you build, simulate and version call flows without writing code — AI Script Builder, Visual Flow Designer, and full versioning." />
    </Head>
    <Header />
    <main className="page">
      <section className="intro">
        <Link href="/" className="back">← Platform overview</Link>
        <div className="eyebrow">FLOW AUTHORING</div>
        <h1>Build call logic without writing code.</h1>
        <p>Three tools, one job: turn what a call flow should do into something that actually runs — fast to
          build, safe to change, and never a mystery once it&apos;s live.</p>
      </section>
      <section className="items">
        {ITEMS.map(item => (
          <div className="item" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            <a href={item.link.href} className="itemLink">{item.link.label} →</a>
          </div>
        ))}
      </section>
      <section className="closing">
        <Link href="/platform/live-operations" className="nextLink">Next: Live Operations →</Link>
      </section>
    </main>
    <Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}
      :global(body){margin:0;background:#06111f}
      .page{color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);}
      .intro{max-width:900px;margin:0 auto;padding:60px 24px 40px}
      .back{color:#69d8ff;text-decoration:none;font-size:.78rem;font-weight:800}
      .eyebrow{color:#718ba0;font-size:.65rem;font-weight:900;letter-spacing:.16em;margin-top:22px}
      h1{font-size:clamp(2rem,4.2vw,2.9rem);line-height:1.1;letter-spacing:-.03em;margin:14px 0 16px}
      .intro p{color:#9eb3c4;line-height:1.7;font-size:1rem;max-width:640px;margin:0}
      .items{max-width:900px;margin:0 auto;padding:10px 24px 40px;display:grid;gap:18px}
      .item{border:1px solid #19384d;border-radius:16px;background:rgba(7,24,38,.72);padding:30px}
      .item h2{margin:0 0 14px;font-size:1.3rem;letter-spacing:-.01em}
      .item p{margin:0 0 16px;color:#a9bcc9;font-size:.92rem;line-height:1.7;max-width:700px}
      .itemLink{color:#69d8ff;text-decoration:none;font-size:.82rem;font-weight:800}
      .itemLink:hover{text-decoration:underline}
      .closing{max-width:900px;margin:0 auto;padding:20px 24px 110px;text-align:right}
      .nextLink{color:#c7dbe8;text-decoration:none;font-size:.88rem;font-weight:800}
      .nextLink:hover{color:#69d8ff}
    `}</style>
  </>;
}
