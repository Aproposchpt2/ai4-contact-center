import Head from 'next/head';
import { useState } from 'react';

// Served only on the generic customer entry host (app.<root>). It holds no customer data and no
// session: it sends people to their own workspace host ({client}.<root>), where they sign in.
export default function FindWorkspacePage() {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const name = slug.trim().toLowerCase().replace(/\.stellaruc\.com$/, '');
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/resolve?slug=${encodeURIComponent(name)}`);
      const body = (await res.json()) as { url?: string };
      if (res.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setError('We could not find that workspace. Check the name in your welcome email.');
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>Sign in to your workspace</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', background: '#01050D', color: '#F4F2ED', fontFamily: 'system-ui, sans-serif' }}>
        <form onSubmit={go} style={{ width: 'min(440px, 100%)', display: 'grid', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Sign in to your workspace</h1>
          <p style={{ margin: 0, opacity: 0.75 }}>Enter your workspace name. It is the first part of your workspace address, for example <b>level-community</b>.</p>
          <label htmlFor="ws" style={{ fontSize: '.8rem', letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.8 }}>Workspace name</label>
          <input
            id="ws"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="your-company"
            style={{ padding: '.8rem 1rem', borderRadius: 8, border: '1px solid rgba(200,169,107,.5)', background: '#07142F', color: 'inherit', fontSize: '1rem' }}
          />
          <button type="submit" disabled={loading || !slug.trim()} style={{ padding: '.85rem 1rem', borderRadius: 8, border: 0, background: '#C8A96B', color: '#01050D', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
            {loading ? 'Looking…' : 'Continue'}
          </button>
          {error && <p role="alert" style={{ margin: 0, color: '#ff9b9b' }}>{error}</p>}
        </form>
      </main>
    </>
  );
}
