import Head from 'next/head';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>AI4 Contact Center | Operations</title>
        <meta
          name="description"
          content="AI4 Contact Center operations entry point for live voice, SMS, web chat, routing, agent assist, QA and compliance."
        />
      </Head>
      <main className="page">
        <section className="hero">
          <div className="brand">AI4 CONTACT CENTER</div>
          <div className="eyebrow">BY APROPOS GROUP LLC</div>
          <h1>AI-Native Intelligent<br />Contact Center OS</h1>
          <p className="summary">
            One operational environment for live voice, SMS, web chat, intelligent routing,
            agent assistance, transcript intelligence, quality assurance and compliance.
          </p>
          <div className="actions">
            <Link className="primary" href="/dashboard">Open Operations Dashboard</Link>
            <Link className="secondary" href="/agent-workspace">Agent Workspace</Link>
            <Link className="secondary" href="/web-chat">Live Web Chat</Link>
          </div>
          <div className="status">
            <span>LIVE VOICE</span><span>SMS</span><span>WEB CHAT</span><span>INTELLIGENT ROUTING</span><span>QA + COMPLIANCE</span>
          </div>
        </section>
      </main>
      <style jsx>{`
        :global(*) { box-sizing: border-box; }
        :global(html), :global(body), :global(#__next) { margin: 0; min-height: 100%; background: #06111f; }
        :global(body) { font-family: Arial, Helvetica, sans-serif; }
        .page {
          min-height: 100vh;
          color: #f7fbff;
          background:
            radial-gradient(circle at 78% 24%, rgba(61, 192, 255, .15), transparent 31%),
            radial-gradient(circle at 15% 78%, rgba(20, 104, 175, .14), transparent 32%),
            linear-gradient(145deg, #06111f 0%, #081827 54%, #06111f 100%);
          display: flex;
          align-items: center;
          padding: 72px 7vw;
        }
        .hero { width: min(100%, 1080px); margin: 0 auto; }
        .brand { color: #50d1ff; font-weight: 800; letter-spacing: .24em; font-size: .88rem; }
        .eyebrow { margin-top: 9px; color: #8298ad; letter-spacing: .22em; font-size: .68rem; }
        h1 { margin: 28px 0 20px; font-size: clamp(3rem, 7vw, 6.8rem); line-height: .94; letter-spacing: -.055em; max-width: 900px; }
        .summary { color: #a9bbcb; max-width: 760px; font-size: clamp(1.05rem, 2vw, 1.32rem); line-height: 1.65; }
        .actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 34px; }
        .actions :global(a) { text-decoration: none; font-weight: 800; border-radius: 8px; padding: 15px 22px; }
        .primary { background: #52cffa; color: #03111c; }
        .secondary { color: #eaf7ff; border: 1px solid #29445a; background: rgba(9, 26, 41, .72); }
        .status { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 52px; padding-top: 24px; border-top: 1px solid #1b3549; }
        .status span { color: #7f9bb0; border: 1px solid #19364b; border-radius: 999px; padding: 8px 12px; font-size: .7rem; font-weight: 800; letter-spacing: .1em; }
        @media (max-width: 640px) {
          .page { align-items: flex-start; padding: 62px 24px 40px; }
          h1 { margin-top: 24px; font-size: 3.4rem; }
          .actions { flex-direction: column; }
          .actions :global(a) { text-align: center; width: 100%; }
          .status { margin-top: 38px; }
        }
      `}</style>
    </>
  );
}
