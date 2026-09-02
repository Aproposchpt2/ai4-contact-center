import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ITEMS = [
  {
    title: 'Multi-Tenant, Role-Based Access Control',
    body: `Tenant isolation and role-based permissions are native to the data model, not bolted on after the
      fact — the exact foundation a white-label or multi-client SaaS offering needs to exist at all. This is
      the difference between "we could probably retrofit multi-tenancy" and "it's already there."`,
  },
  {
    title: 'Compliance Automation & Flow Governance',
    body: `Compliance findings surface automatically against real interactions instead of waiting for an audit,
      and Flow Governance keeps call-logic changes reviewable and controlled — who changed what, when, and
      whether it passed validation before going live.`,
    link: { href: '/compliance-automation', label: 'Open Compliance Automation' },
  },
  {
    title: 'Knowledge Vault, Prompt Manager & Integration Hub',
    body: `A Knowledge Vault for the content agents and AI draw from, a Prompt Manager for the language models
      actually doing the work, and an Integration Hub for connecting the platform outward — the shared
      infrastructure every other capability on this site is built on top of.`,
    link: { href: '/knowledge-vault', label: 'Open Knowledge Vault' },
  },
];

export default function GovernancePlatformPage() {
  return <>
    <Head>
      <title>Governance & Platform — AI4 Contact Center</title>
      <meta name="description" content="The shared foundation under AI4 Contact Center — multi-tenant RBAC, compliance automation, flow governance, and platform services." />
    </Head>
    <Header />
    <main className="page">
      <section className="intro">
        <Link href="/" className="back">← Platform overview</Link>
        <div className="eyebrow">GOVERNANCE &amp; PLATFORM</div>
        <h1>Built for more than one business.</h1>
        <p>The part that doesn&apos;t show up in a demo but decides whether a platform can actually be
          white-labeled or sold to more than one customer at a time.</p>
      </section>
      <section className="items">
        {ITEMS.map(item => (
          <div className="item" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            {item.link && <a href={item.link.href} className="itemLink">{item.link.label} →</a>}
          </div>
        ))}
      </section>
      <section className="closing">
        <Link href="/acquisition" className="nextLink">See the full buyer walkthrough →</Link>
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
