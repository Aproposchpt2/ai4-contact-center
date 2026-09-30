'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JourneyDesignerDashboard from '@/components/JourneyDesignerDashboard';
import type { JourneyDefinition } from '@/lib/journeyDesignerEngine';

const SAMPLE = JSON.stringify({
  id: 'journey-demo',
  name: 'Billing Resolution Journey',
  touchpoints: [
    { id: 'tp1', name: 'IVR Greeting', channel: 'voice', flowId: 'flow-main', expectedCompletionRate: 0.92 },
    { id: 'tp2', name: 'Intent Identification', channel: 'voice', flowId: 'flow-billing', expectedCompletionRate: 0.84 },
    { id: 'tp3', name: 'Agent Resolution', channel: 'voice', flowId: 'flow-agent', expectedCompletionRate: 0.77 },
  ],
}, null, 2);

export default function JourneyDesignerPage() {
  const [input, setInput] = useState(SAMPLE);
  const [analysis, setAnalysis] = useState<{
    journey: JourneyDefinition;
    simulation: {
      overallScore: number;
      timeline: Array<{ touchpointName: string; experienceScore: number; dropoffRisk: string }>;
      dropoffs: Array<{ touchpointId: string; reason: string }>;
      recommendations: string[];
    };
    summary: { touchpoints: number; highRiskTouchpoints: number; overallScore: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parse() {
    return JSON.parse(input) as JourneyDefinition;
  }

  async function post(path: string) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parse()) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? 'Request failed');
    return data;
  }

  async function runCreate() {
    setBusy(true); setError(null);
    try {
      const body = parse();
      const data = await post('/api/journey/create');
      setInput(JSON.stringify({ ...(data.journey as JourneyDefinition), touchpoints: body.touchpoints }, null, 2));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runSimulate() {
    setBusy(true); setError(null);
    try {
      const data = await post('/api/journey/simulate');
      if (analysis) setAnalysis({ ...analysis, simulation: data.simulation });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runAnalyze() {
    setBusy(true); setError(null);
    try {
      const data = await post('/api/journey/analyze');
      setAnalysis(data);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'journey-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            Intelligent Customer Engagement Operation Center · System #22
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Customer Journey Designer & Experience Simulator
          </h1>
          <JourneyDesignerDashboard
            input={input}
            onInputChange={setInput}
            analysis={analysis}
            busy={busy}
            error={error}
            onCreate={runCreate}
            onSimulate={runSimulate}
            onAnalyze={runAnalyze}
            onDownload={download}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

