import { useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';

// Direct sign-out address: clears this browser's session, then returns to the sign-in page.
export default function LogoutPage() {
  useEffect(() => {
    (async () => {
      try {
        await supabase?.auth.signOut({ scope: 'local' });
      } catch {
        // fall through to the sign-in page either way
      }
      window.location.assign('/login');
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Signing out</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#01050D', color: '#F4F2ED', fontFamily: 'system-ui, sans-serif' }}>
        <p>Signing you out…</p>
      </main>
    </>
  );
}
