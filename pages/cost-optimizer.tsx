'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CostOptimizerDashboard from '@/components/CostOptimizerDashboard';
import type { CostReport } from '@/lib/costOptimizationEngine';

const SAMPLE = JSON.stringify({
  interactionsPerMonth: 120000,
  channelMix: [
    { channel: 'voice', volumePct: 48, costPerInteraction: 5.4 },
    { channel: 'chat', volumePct: 28, costPerInteraction: 3.2 },
    { channel: 'email', volumePct: 14, costPerInteraction: 2.7 },
    { channel: 'self-service', volumePct: 10, costPerInteraction: 0.8 },
  ],
  automationRate: 32,
  agentHourlyCost: 28,
  avgHandleTimeMinutes: 9.5,
}, null, 2);

export default function CostOptimizerPage() {
  const [input, setInput] = useState(SAMPLE);
  const [report, setReport] = useState<CostReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    try {
      const payload = JSON.parse(input);
      const response = await fetch('/api/cost/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Cost report failed');
      setReport(data.report as CostReport);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cost-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>AI4 Contact Center · System #28</p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>Cost Optimization & ROI Engine</h1>
          <CostOptimizerDashboard input={input} onInputChange={setInput} report={report} busy={busy} error={error} onRun={run} onDownload={download} />
        </div>
      </main>
      <Footer />
    </>
  );
}

