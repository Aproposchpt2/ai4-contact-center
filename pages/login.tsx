'use client';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Step = 'email' | 'otp' | 'done';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep]     = useState<Step>('email');
  const [email, setEmail]   = useState('');
  const [otp, setOtp]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep('otp');
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email, token: otp, type: 'email',
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep('done');
    setTimeout(() => router.push('/dashboard'), 1200);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', 'Jost', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: 'min(440px, 100%)', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '12px', padding: 'clamp(1.8rem,4vw,2.8rem)', position: 'relative' }}>
          {/* Top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,#5bd3ff,rgba(91,211,255,.1))', borderRadius: '12px 12px 0 0' }} />

          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.5rem' }}>
            AI4 Contact Center
          </p>

          {step === 'done' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>✓</div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '.5rem' }}>You're signed in.</h2>
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '.88rem' }}>Redirecting to your dashboard…</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 700, color: '#fff', marginBottom: '.5rem', lineHeight: 1.1 }}>
                {step === 'email' ? 'Sign in to AI4 CC' : 'Enter your code'}
              </h1>
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '.86rem', marginBottom: '1.6rem', lineHeight: 1.6 }}>
                {step === 'email'
                  ? 'Enter your email — we\'ll send a one-time sign-in code.'
                  : `We sent a 6-digit code to ${email}.`}
              </p>

              {!configured && (
                <div style={{ padding: '.8rem 1rem', background: 'rgba(255,180,50,.06)', border: '1px solid rgba(255,180,50,.2)', borderRadius: '6px', fontSize: '.78rem', color: '#fbbf24', marginBottom: '1.2rem' }}>
                  Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable auth.
                </div>
              )}

              {step === 'email' ? (
                <form onSubmit={handleSendOtp}>
                  <label style={{ display: 'block', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '.5rem' }}>Email address</label>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com" disabled={!configured || loading}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#e8f0fe', padding: '.75rem 1rem', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none', marginBottom: '1rem' }}
                  />
                  {error && <p style={{ color: '#ff7070', fontSize: '.82rem', marginBottom: '.8rem' }}>{error}</p>}
                  <button type="submit" disabled={!configured || loading} style={{ width: '100%', background: '#5bd3ff', color: '#06111f', border: 'none', borderRadius: '6px', padding: '.85rem', fontWeight: 800, fontSize: '.78rem', letterSpacing: '.14em', textTransform: 'uppercase', cursor: (!configured || loading) ? 'not-allowed' : 'pointer', opacity: (!configured || loading) ? 0.6 : 1 }}>
                    {loading ? 'Sending…' : 'Send Sign-In Code →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <label style={{ display: 'block', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '.5rem' }}>One-Time Code</label>
                  <input
                    type="text" required value={otp} onChange={e => setOtp(e.target.value)}
                    placeholder="123456" maxLength={6} disabled={loading}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#5bd3ff', padding: '.75rem 1rem', fontSize: '1.4rem', fontFamily: 'monospace', letterSpacing: '.2em', textAlign: 'center', outline: 'none', marginBottom: '1rem' }}
                  />
                  {error && <p style={{ color: '#ff7070', fontSize: '.82rem', marginBottom: '.8rem' }}>{error}</p>}
                  <button type="submit" disabled={loading} style={{ width: '100%', background: '#5bd3ff', color: '#06111f', border: 'none', borderRadius: '6px', padding: '.85rem', fontWeight: 800, fontSize: '.78rem', letterSpacing: '.14em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Verifying…' : 'Sign In →'}
                  </button>
                  <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(null); }} style={{ display: 'block', width: '100%', marginTop: '.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,.35)', fontSize: '.78rem', cursor: 'pointer' }}>
                    ← Use a different email
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
