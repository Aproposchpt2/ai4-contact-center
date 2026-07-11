'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ExperimentationDashboard from '@/components/ExperimentationDashboard';

const SAMPLE = JSON.stringify({
  id: 'exp-demo',
  name: 'Billing Routing Experiment',
  type: 'ab',
  variants: [
    { id: 'A', name: 'Current flow', flowId: 'flow-billing-v1' },
    { id: 'B', name: 'Optimized flow', flowId: 'flow-billing-v2' },
  ],
  trafficSplit: [50, 50],
}, null, 2);

export default function ExperimentationPage() {
  const [input, setInput] = useState(SAMPLE);
  const [result, setResult] = useState<{
    metricsByVariant: Array<{ variantId: string; variantName: string; metrics: { csat: number; ahtSeconds: number; resolutionRate: number; dropoffRate: number; sentiment: number } }>;
    winner: { variantId: string; reason: string };
    summary: { sampleSize: number; confidence: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    try {
      const payload = JSON.parse(input);
      const response = await fetch('/api/experiments/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Experiment failed');
      setResult(data.result);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experiment-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>AI4 Contact Center · System #27</p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>Flow A/B Testing & Experimentation</h1>
          <ExperimentationDashboard input={input} onInputChange={setInput} result={result} busy={busy} error={error} onRun={run} onDownload={download} />
        </div>
      </main>
      <Footer />
    </>
  );
}

