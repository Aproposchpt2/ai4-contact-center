import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PHONE_DISPLAY = '(725) 330-5102';
const PHONE_TEL = 'tel:+17253305102';

const WHY = [
  { title: 'It already works — call it', body: 'No sandbox, no "coming soon." Dial the number and a live AI agent runs a real intake conversation, then a structured lead lands in the CRM automatically. Prove it to yourself in two minutes, not a six-week pilot.' },
  { title: 'No per-seat, no per-minute surprises', body: 'Genesys, RingCentral, Five9 and NICE all charge $65–240 per seat per month, plus per-minute voice and AI add-ons on top. Enterprise implementation alone runs $50K–500K before the first invoice. This is a one-time acquisition — you own it, no recurring fee to a vendor.' },
  { title: 'A real platform underneath, not a thin wrapper', body: 'Multichannel routing, Lead Management, Customer 360, QA, compliance automation, and multi-tenant architecture already built — the same foundation you’d need to run this for your own clients under your own brand.' },
];

export default function PartnersPage() {
  return <>
    <Head>
      <title>AI4 Contact Center — For BPOs, MSPs &amp; Agencies</title>
      <meta name="description" content="Before you sign with another contact-center vendor, call this number. A live AI agent answers, runs a real intake, and creates a lead automatically — see it work in two minutes." />
    </Head>
    <Header />
    <main className="page">
      <section className="hero">
        <div className="eyebrow">FOR BPOs, MSPs &amp; AGENCIES</div>
        <h1>Before you sign with another vendor, call this number.</h1>
        <p className="lede">
          A live AI agent answers, runs a real intake conversation, and turns the call into a qualified lead —
          automatically, in your own CRM. No pilot, no sales deck standing in for a product. Two minutes on
          the phone tells you more than a six-week evaluation.
        </p>
        <div className="ctaRow">
          <a href={PHONE_TEL} className="callCta">
            <span className="callLabel">Experience it now</span>
            <span className="callNumber">{PHONE_DISPLAY}</span>
          </a>
          <Link href="/demo" className="ghostCta">Full guided demo →</Link>
        </div>
      </section>

      <section className="why">
        {WHY.map(w => (
          <div className="whyCard" key={w.title}>
            <h2>{w.title}</h2>
            <p>{w.body}</p>
          </div>
        ))}
      </section>

      <section className="offer">
        <h2>Three ways to work together</h2>
        <div className="offerGrid">
          <div className="offerCard">
            <h3>License it</h3>
            <p>Run AI4CC as your own AI intake/contact-center layer, deployed for your operation.</p>
          </div>
          <div className="offerCard">
            <h3>White-label it</h3>
            <p>Offer it under your own brand to your clients — the multi-tenant foundation is already built for exactly this.</p>
          </div>
          <div className="offerCard hi">
            <h3>Acquire it outright</h3>
            <p>Full technology-asset acquisition — $25,000, own the source, no recurring fee to anyone.</p>
          </div>
        </div>
        <p className="offerNote">Whichever fits — the fastest way to decide is to call the number above first.</p>
      </section>

      <section className="closing">
        <a href={PHONE_TEL} className="callCta small">Call {PHONE_DISPLAY} →</a>
        <Link href="/acquisition" className="ghostCta">See the full walkthrough →</Link>
      </section>
    </main>
    <Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}
      :global(body){margin:0;background:#06111f}
      .page{color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);}
      .hero{max-width:900px;margin:0 auto;padding:80px 24px 46px}
      .eyebrow{color:#718ba0;font-size:.65rem;font-weight:900;letter-spacing:.16em}
      h1{font-size:clamp(2rem,4.6vw,3rem);line-height:1.14;letter-spacing:-.03em;margin:16px 0 18px}
      .lede{color:#9eb3c4;line-height:1.75;font-size:1.02rem;max-width:680px;margin:0 0 32px}
      .ctaRow{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
      .callCta{display:flex;flex-direction:column;gap:2px;text-decoration:none;background:#69d8ff;color:#06111f;padding:15px 24px;border-radius:12px;box-shadow:0 0 0 1px rgba(105,216,255,.4), 0 18px 40px -12px rgba(105,216,255,.45);}
      .callCta.small{padding:13px 22px;flex-direction:row;align-items:center}
      .callLabel{font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;opacity:.75}
      .callNumber{font-size:1.3rem;font-weight:900}
      .ghostCta{color:#c7dbe8;text-decoration:none;font-size:.85rem;font-weight:700;border-bottom:1px solid rgba(255,255,255,.25);padding-bottom:2px}
      .ghostCta:hover{border-color:#69d8ff;color:#69d8ff}

      .why{max-width:900px;margin:0 auto;padding:10px 24px 60px;display:grid;gap:16px}
      .whyCard{border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.72);padding:26px}
      .whyCard h2{margin:0 0 12px;font-size:1.12rem}
      .whyCard p{margin:0;color:#a9bcc9;font-size:.9rem;line-height:1.7}

      .offer{max-width:900px;margin:0 auto;padding:10px 24px 60px}
      .offer h2{font-size:1.5rem;margin:0 0 22px;letter-spacing:-.02em}
      .offerGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
      .offerCard{border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.72);padding:22px}
      .offerCard.hi{border-color:#69d8ff;background:rgba(105,216,255,.06)}
      .offerCard h3{margin:0 0 10px;font-size:1rem}
      .offerCard p{margin:0;color:#a9bcc9;font-size:.84rem;line-height:1.6}
      .offerNote{margin:18px 0 0;color:#5c7284;font-size:.82rem}

      .closing{max-width:900px;margin:0 auto;padding:10px 24px 100px;display:flex;align-items:center;gap:26px;flex-wrap:wrap}

      @media(max-width:700px){ .offerGrid{grid-template-columns:1fr} }
    `}</style>
  </>;
}
