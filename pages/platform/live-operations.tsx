import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ITEMS = [
  {
    title: 'Unified Agent Workspace',
    body: `Voice, SMS and Web Chat interactions in one screen, with canonical routing, live transcripts, AI
      Assist suggestions, QA scoring and compliance flags attached to every conversation — not three separate
      tools an agent has to tab between. The conversational AI intake agent feeds this same workspace: a call
      it handles shows up as a real interaction here, not in a separate silo.`,
    link: { href: '/agent-workspace', label: 'Open Agent Workspace' },
  },
  {
    title: 'Lead Management & Activities/Tasks',
    body: `Every captured lead carries a full commercial workflow — pipeline stage, priority, estimated value
      and probability, ownership, next action and follow-up date. Activities and Tasks give it a built-in path
      to a closed deal: a lead doesn't just get captured, it gets worked. This is the CRM layer a real sales
      team actually runs on, not a placeholder contacts list.`,
    link: { href: '/lead-management', label: 'Open Lead Management' },
  },
  {
    title: 'Customer 360',
    body: `One unified view per contact — interaction history across every channel, linked leads, tasks,
      activities and channel counts, brought together in a single screen. It's the record an agent needs
      mid-conversation, not five browser tabs and a guess.`,
    link: { href: '/customer-360', label: 'Open Customer 360' },
  },
];

export default function LiveOperationsPage() {
  return <>
    <Head>
      <title>Live Operations — AI4 Contact Center</title>
      <meta name="description" content="How AI4 Contact Center turns real conversations into a working commercial pipeline — Agent Workspace, Lead Management, and Customer 360." />
    </Head>
    <Header />
    <main className="page">
      <section className="intro">
        <Link href="/" className="back">← Platform overview</Link>
        <div className="eyebrow">LIVE OPERATIONS</div>
        <h1>Where calls become customers.</h1>
        <p>Capturing a lead is easy. Turning it into a worked, tracked opportunity — without another tool,
          another login, or a copy-paste into a spreadsheet — is the actual product.</p>
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
        <Link href="/platform/intelligence-qa" className="nextLink">Next: Intelligence & QA →</Link>
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
