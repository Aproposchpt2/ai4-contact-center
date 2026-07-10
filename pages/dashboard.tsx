'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlowCard from '@/components/FlowCard';
import { getFlows, deleteFlow, type SavedFlow } from '@/lib/storage';

export default function DashboardPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<SavedFlow[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFlows(getFlows());
  }, []);

  function handleDelete(id: string) {
    deleteFlow(id);
    setFlows(getFlows());
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

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.4rem' }}>
            <div>
              <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
                AI4 Contact Center · Dashboard
              </p>
              <h1 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 700, lineHeight: 1.1, margin: 0, color: '#fff' }}>
                Saved Flows
              </h1>
            </div>
            <Link href="/builder" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: '#5bd3ff', color: '#06111f', fontWeight: 800, fontSize: '.76rem', letterSpacing: '.14em', textTransform: 'uppercase', textDecoration: 'none', padding: '.7rem 1.4rem', borderRadius: '6px', alignSelf: 'flex-end' }}>
              + New Flow
            </Link>
          </div>

          {/* Stats strip */}
          {mounted && flows.length > 0 && (
            <div style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '8px', overflow: 'hidden', marginBottom: '2rem' }}>
              {[
                { label: 'Total Flows',    value: flows.length   },
                { label: 'Total Options',  value: totalOptions   },
                { label: 'Last Built',     value: new Date(flows[0]?.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: 1, background: '#06111f', padding: '1.2rem 1.5rem' }}>
                  <div style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: '.4rem' }}>{label}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Flows */}
          {!mounted ? null : flows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px dashed rgba(255,255,255,.1)', borderRadius: '10px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📂</div>
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '.92rem', marginBottom: '1.5rem' }}>
                No saved flows yet. Build your first one and click "Save to Dashboard."
              </p>
              <Link href="/builder" style={{ background: '#5bd3ff', color: '#06111f', fontWeight: 800, fontSize: '.76rem', letterSpacing: '.14em', textTransform: 'uppercase', textDecoration: 'none', padding: '.75rem 1.6rem', borderRadius: '6px' }}>
                Open Script Builder →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {flows.map(flow => (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  onOpen={handleOpen}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
