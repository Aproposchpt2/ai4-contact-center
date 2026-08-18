'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlowCard from '@/components/FlowCard';
import type { SavedFlow } from '@/lib/storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type TenantContext = { id: string; name: string; role: string };

export default function DashboardPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<SavedFlow[]>([]);
  const [mounted, setMounted] = useState(false);
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    async function loadFlows() {
      if (!isSupabaseConfigured() || !supabase) {
        setError('Canonical Supabase configuration is required for the AI4 Contact Center dashboard.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      try {
        const res = await fetch('/api/get-flows', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await res.json();
        if (!res.ok) {
          setError(payload?.error ?? 'Unable to load flows.');
          return;
        }

        const cloudFlows: Array<{
          id: string;
          name: string;
          text_input: string;
          parsed_output: object;
          engine: string;
          status: string;
          version: number;
          created_at: string;
        }> = payload.flows ?? [];

        setTenant(payload.tenant ?? null);
        setFlows(cloudFlows.map((f) => ({
          id: f.id,
          name: f.name,
          text: f.text_input,
          parsed: f.parsed_output,
          engine: f.engine as 'ai' | 'rules',
          createdAt: f.created_at,
        })));
      } catch {
        setError('Network error while loading the canonical flow library.');
      }
    }

    loadFlows();
  }, [router]);

  async function handleDelete(id: string) {
    if (!supabase || deletingId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/delete-flow?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? 'Unable to delete flow.');
        return;
      }
      setFlows((prev) => prev.filter((flow) => flow.id !== id));
    } catch {
      setError('Network error while deleting the flow.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleOpen(flow: SavedFlow) {
    router.push(`/builder?text=${encodeURIComponent(flow.text)}&name=${encodeURIComponent(flow.name)}`);
  }

  const totalOptions = flows.reduce((acc, f) => {
    const p = f.parsed as { options?: unknown[] };
    return acc + (p?.options?.length ?? 0);
  }, 0);

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', 'Jost', sans-serif", padding: '3rem clamp(1.5rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.4rem' }}>
            <div>
              <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
                AI4 Contact Center · Canonical Dashboard
              </p>
              <h1 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 700, lineHeight: 1.1, margin: 0, color: '#fff' }}>
                Saved Flows
              </h1>
              {tenant && (
                <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '.78rem', marginTop: '.55rem' }}>
                  {tenant.name} · {tenant.role}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap', alignSelf: 'flex-end' }}>
              <Link href="/agent-workspace" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'rgba(91,211,255,.08)', border: '1px solid rgba(91,211,255,.28)', color: '#5bd3ff', fontWeight: 800, fontSize: '.76rem', letterSpacing: '.12em', textTransform: 'uppercase', textDecoration: 'none', padding: '.7rem 1.1rem', borderRadius: '6px' }}>
                Agent Workspace →
              </Link>
              <Link href="/builder" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: '#5bd3ff', color: '#06111f', fontWeight: 800, fontSize: '.76rem', letterSpacing: '.14em', textTransform: 'uppercase', textDecoration: 'none', padding: '.7rem 1.4rem', borderRadius: '6px' }}>
                + New Flow
              </Link>
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: '1.2rem', padding: '.8rem 1rem', border: '1px solid rgba(255,100,100,.25)', background: 'rgba(255,100,100,.06)', borderRadius: '7px', color: '#ff8f8f', fontSize: '.82rem' }}>
              {error}
            </div>
          )}

          {mounted && flows.length > 0 && (
            <div style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '8px', overflow: 'hidden', marginBottom: '2rem' }}>
              {[
                { label: 'Total Flows', value: flows.length },
                { label: 'Total Options', value: totalOptions },
                { label: 'Last Built', value: new Date(flows[0]?.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: 1, background: '#06111f', padding: '1.2rem 1.5rem' }}>
                  <div style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: '.4rem' }}>{label}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {!mounted ? null : flows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px dashed rgba(255,255,255,.1)', borderRadius: '10px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📂</div>
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '.92rem', marginBottom: '1.5rem' }}>
                No canonical flows yet. Build the first tenant-owned contact flow.
              </p>
              <Link href="/builder" style={{ background: '#5bd3ff', color: '#06111f', fontWeight: 800, fontSize: '.76rem', letterSpacing: '.14em', textTransform: 'uppercase', textDecoration: 'none', padding: '.75rem 1.6rem', borderRadius: '6px' }}>
                Open Script Builder →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', opacity: deletingId ? .75 : 1 }}>
              {flows.map(flow => (
                <FlowCard key={flow.id} flow={flow} onOpen={handleOpen} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
