import { trackPublicEvent } from '@/lib/publicAnalytics';
import Head from 'next/head';
import { useMemo, useState, type FormEvent } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Minimum-friction public intake: four required fields only, no qualification questions.
// Qualification happens after capture, in the private Sales Service assessment.
// See "CUSTOMER ENGAGEMENT OPERATION CENTER Intake form.txt" for the governing spec.

function newToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `intake-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function IntakePage() {
  const clientToken = useMemo(() => newToken(), []);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || submitted) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/public/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, businessName, phone, email, clientToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
      setSubmitted(true);
      if (data?.ok) trackPublicEvent('generate_lead');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Get Started — Intelligent Customer Engagement Operation Center</title>
        <meta name="description" content="Tell us how to reach you." />
      </Head>
      <Header />
      <main className="page">
        <section className="card">
          {submitted ? (
            <div className="success">
              <div className="eyebrow">THANK YOU</div>
              <h1>We&apos;ve received your information.</h1>
              <p>We&apos;ll contact you to begin your Sales Service assessment.</p>
            </div>
          ) : (
            <>
              <div className="eyebrow">GET STARTED</div>
              <h1>Ready to keep your sales operation open 24/7?</h1>
              <p className="sub">Tell us how to reach you.</p>

              <form onSubmit={submit}>
                <label htmlFor="name">Name</label>
                <input id="name" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />

                <label htmlFor="businessName">Business Name</label>
                <input id="businessName" name="businessName" autoComplete="organization" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={submitting} />

                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} />

                <label htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />

                {error && <div className="error">{error}</div>}

                <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Get Started'}</button>
              </form>
            </>
          )}
        </section>
      </main>
      <Footer />
      <style jsx>{`
        :global(body){margin:0;background:#06111f}
        .page{min-height:70vh;color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.14),transparent 32%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);display:grid;place-items:center;padding:70px 20px}
        .card{width:100%;max-width:460px;border:1px solid #19384d;border-radius:18px;background:rgba(7,24,38,.78);padding:36px}
        .eyebrow{color:#69d8ff;font-size:.65rem;font-weight:900;letter-spacing:.16em}
        h1{font-size:clamp(1.5rem,3.4vw,2rem);letter-spacing:-.02em;margin:12px 0 8px;line-height:1.25}
        .sub{color:#9eb3c4;margin:0 0 24px;font-size:.95rem}
        form{display:grid;gap:14px}
        label{color:#718ba0;font-size:.66rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:-6px}
        input{border:1px solid #29495d;border-radius:9px;background:rgba(255,255,255,.03);color:#eef8ff;padding:12px 14px;font-size:1rem;font-family:inherit}
        input:focus{outline:none;border-color:#69d8ff}
        button{margin-top:8px;border:none;border-radius:10px;background:#69d8ff;color:#06111f;padding:14px 18px;font-size:.85rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase;cursor:pointer}
        button:hover:not(:disabled){filter:brightness(1.06)}
        button:disabled{opacity:.6;cursor:default}
        .error{color:#ff9696;font-size:.85rem;margin-top:-4px}
        .success{text-align:center}
        .success h1{margin-top:12px}
        .success p{color:#9eb3c4;font-size:1rem;line-height:1.6}
      `}</style>
    </>
  );
}
