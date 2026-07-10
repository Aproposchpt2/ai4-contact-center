import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const FEATURES = [
  { icon: '⚡', title: 'Instant Logic Generation', desc: 'Paste plain English. Get structured JSON call flow logic in under a second.' },
  { icon: '🗂️', title: '6 Industry Templates', desc: 'Healthcare, university, government, retail, finance, property management — ready to customize.' },
  { icon: '💾', title: 'Save & Revisit', desc: 'Every flow is saved locally. Open your Dashboard to manage, re-open, or export any past build.' },
  { icon: '📥', title: 'One-Click Download', desc: 'Download call-flow.json with one click — ready to feed into your IVR, CCaaS, or custom platform.' },
  { icon: '🔧', title: 'Rule-Based Parser', desc: 'Deterministic extraction: menus, DTMF options, queues, after-hours routing, holiday messages.' },
  { icon: '🚀', title: 'Zero Setup', desc: 'No API key, no database, no config. Open the builder and start generating.' },
];

const STEPS = [
  { n: '01', title: 'Describe your call flow', body: 'Type or paste a plain-English description of your IVR logic — menus, options, after-hours, holidays.' },
  { n: '02', title: 'Generate the logic',      body: 'Hit "Generate Logic." The parser extracts every routing rule and builds structured JSON in milliseconds.' },
  { n: '03', title: 'Download and deploy',      body: 'Download call-flow.json and drop it into your contact center platform, IVR system, or CCaaS workflow.' },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main style={{ background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', 'Jost', sans-serif" }}>

        {/* ── HERO ── */}
        <section style={{
          minHeight: '90vh', display: 'flex', alignItems: 'center',
          padding: 'clamp(4rem,8vh,7rem) clamp(1.5rem,4vw,3rem)',
          background: 'linear-gradient(160deg, #06111f 0%, #0a1e38 60%, #06111f 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* BG glow */}
          <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '50vw', height: '80vh', background: 'radial-gradient(ellipse at 60% 40%, rgba(91,211,255,.07), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '780px', position: 'relative', zIndex: 1 }}>
            <span style={{ display: 'inline-block', fontSize: '.66rem', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#5bd3ff', background: 'rgba(91,211,255,.1)', border: '1px solid rgba(91,211,255,.2)', borderRadius: '999px', padding: '.3rem .9rem', marginBottom: '1.4rem' }}>
              AI4 Contact Center · Engineering Suite
            </span>
            <h1 style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.03em', margin: '0 0 1.2rem', color: '#fff' }}>
              Build call flows<br />
              <span style={{ color: '#5bd3ff' }}>in plain English.</span>
            </h1>
            <p style={{ fontSize: 'clamp(.95rem, 1.4vw, 1.15rem)', color: 'rgba(255,255,255,.6)', lineHeight: 1.75, maxWidth: '580px', marginBottom: '2rem' }}>
              Describe your IVR routing logic the way you'd explain it to a colleague.
              AI Script Builder converts it into structured JSON — menus, DTMF options,
              queues, after-hours, and holidays — instantly.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/builder" style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: '#5bd3ff', color: '#06111f', fontWeight: 800, fontSize: '.82rem', letterSpacing: '.16em', textTransform: 'uppercase', textDecoration: 'none', padding: '.9rem 2rem', borderRadius: '7px', boxShadow: '0 8px 28px rgba(91,211,255,.25)' }}>
                Open Script Builder →
              </Link>
              <Link href="/templates" style={{ fontSize: '.78rem', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,.2)', paddingBottom: '2px' }}>
                Browse Templates
              </Link>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ padding: 'clamp(4rem,8vh,7rem) clamp(1.5rem,4vw,3rem)', borderTop: '1px solid rgba(255,255,255,.06)', background: '#07121f' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.8rem' }}>How It Works</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 700, color: '#fff', letterSpacing: '-.02em', marginBottom: 'clamp(2.5rem,5vh,4rem)', lineHeight: 1.1 }}>
              Three steps.<br /><span style={{ color: 'rgba(255,255,255,.4)' }}>No configuration.</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.06)' }}>
              {STEPS.map(({ n, title, body }) => (
                <div key={n} style={{ background: '#07121f', padding: 'clamp(2rem,4vw,3rem) clamp(1.5rem,3vw,2.5rem)' }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(3rem,6vw,4.5rem)', color: 'rgba(91,211,255,.12)', lineHeight: 1, marginBottom: '1.5rem' }}>{n}</div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '.7rem', lineHeight: 1.2 }}>{title}</h3>
                  <p style={{ fontSize: '.86rem', color: 'rgba(255,255,255,.45)', lineHeight: 1.7 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section style={{ padding: 'clamp(4rem,8vh,7rem) clamp(1.5rem,4vw,3rem)', background: '#06111f', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.8rem' }}>Features</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 700, color: '#fff', letterSpacing: '-.02em', marginBottom: 'clamp(2.5rem,5vh,4rem)', lineHeight: 1.1 }}>
              Everything you need.<br /><span style={{ color: 'rgba(255,255,255,.4)' }}>Nothing you don't.</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.06)' }}>
              {FEATURES.map(({ icon, title, desc }) => (
                <div key={title} style={{ background: '#06111f', padding: '2rem 1.8rem' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>{icon}</div>
                  <h3 style={{ fontSize: '.92rem', fontWeight: 700, color: '#fff', marginBottom: '.5rem' }}>{title}</h3>
                  <p style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.42)', lineHeight: 1.7, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ padding: 'clamp(5rem,10vh,8rem) clamp(1.5rem,4vw,3rem)', textAlign: 'center', background: 'linear-gradient(160deg,#07121f,#0a1e38)', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '1rem' }}>Get Started</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 800, color: '#fff', letterSpacing: '-.02em', marginBottom: '1rem', lineHeight: 1.08 }}>
            Your first call flow<br />takes 30 seconds.
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,.45)', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
            No signup. No API key. Open the builder and describe your IVR. Done.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/builder" style={{ background: '#5bd3ff', color: '#06111f', fontWeight: 800, fontSize: '.82rem', letterSpacing: '.16em', textTransform: 'uppercase', textDecoration: 'none', padding: '.9rem 2.2rem', borderRadius: '7px' }}>
              Open Script Builder →
            </Link>
            <Link href="/templates" style={{ background: 'rgba(255,255,255,.07)', color: '#fff', fontWeight: 700, fontSize: '.78rem', letterSpacing: '.14em', textTransform: 'uppercase', textDecoration: 'none', padding: '.9rem 2rem', borderRadius: '7px', border: '1px solid rgba(255,255,255,.15)' }}>
              Browse Templates
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
