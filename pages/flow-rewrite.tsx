'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlowRewriteDashboard from '@/components/FlowRewriteDashboard';

const SAMPLE = JSON.stringify({
  description: 'Rewrite billing flow to improve self-service containment and add robust error handling.',
  baseFlow: {
    start: 'greeting',
    nodes: [
      { id: 'greeting', type: 'prompt', text: 'Welcome. Please choose a topic.' },
      { id: 'triage', type: 'intent', routes: ['billing', 'support'] },
    ],
  },
  constraints: ['Do not route billing disputes to queue-x'],
}, null, 2);

export default function FlowRewritePage() {
  const [input, setInput] = useState(SAMPLE);
  const [rewrite, setRewrite] = useState<{
    originalFlow: Record<string, unknown>;
    rewrittenFlow: Record<string, unknown>;
    diff: { structural: string[]; routing: string[] };
    rationale: { whatChanged: string[]; why: string[]; expectedImpact: string[] };
    recommendations: string[];
    summary: { changedNodes: number; changedRoutes: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    try {
      const payload = JSON.parse(input);
      const response = await fetch('/api/flow-rewrite/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Flow rewrite failed');
      setRewrite(data.result);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>AI4 Contact Center · System #32</p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>Flow Rewrite Engine (LLM-Native Authoring)</h1>
          <FlowRewriteDashboard
            input={input}
            onInputChange={setInput}
            rewrite={rewrite}
            busy={busy}
            error={error}
            onRun={run}
            onDownloadFlow={() => rewrite && download(rewrite.rewrittenFlow, 'rewritten-flow.json')}
            onDownloadRationale={() => rewrite && download(rewrite.rationale, 'rewrite-rationale.json')}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

