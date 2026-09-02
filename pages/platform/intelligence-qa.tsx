import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ITEMS = [
  {
    title: 'Analytics Engine & Transcript Intelligence',
    body: `Every interaction generates a transcript, and every transcript is mined for what actually happened —
      topics, sentiment, outcomes — rolled up into platform-wide analytics. This is how you find the pattern
      behind "why are calls about billing taking twice as long" without listening to a hundred recordings.`,
    link: { href: '/analytics-engine', label: 'Open Analytics Engine' },
  },
  {
    title: 'Quality Assurance & Agent Coaching',
    body: `QA scoring runs against real interactions, not spot-checked samples, and Agent Coaching turns the
      results into something an agent can act on — specific, tied to a real call, not a generic training
      module. Compliance and quality stop being a once-a-quarter audit and become a running signal.`,
    link: { href: '/quality-assurance', label: 'Open Quality Assurance' },
  },
  {
    title: 'Intent Taxonomy & Routing Optimizer',
    body: `Intent Taxonomy classifies what callers are actually asking for, and the Routing Optimizer uses that
      classification to get calls to the right place faster — fewer transfers, fewer "let me connect you to
      someone who can help," better first-contact resolution.`,
    link: { href: '/intent-taxonomy', label: 'Open Intent Taxonomy' },
  },
];

export default function IntelligenceQaPage() {
  return <>
    <Head>
      <title>Intelligence & QA — AI4 Contact Center</title>
      <meta name="description" content="How AI4 Contact Center turns every call into data — analytics, transcript intelligence, QA scoring, agent coaching, and intent-based routing." />
    </Head>
    <Header />
    <main className="page">
      <section className="intro">
        <Link href="/" className="back">← Platform overview</Link>
        <div className="eyebrow">INTELLIGENCE &amp; QA</div>
        <h1>Know what actually happened on every call.</h1>
        <p>Not a sampling. Not a guess after a customer complains. A running, structured record of quality,
          intent and outcome across every interaction the platform handles.</p>
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
        <Link href="/platform/governance-platform" className="nextLink">Next: Governance & Platform →</Link>
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
