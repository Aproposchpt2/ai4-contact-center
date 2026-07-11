'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgentAssistDashboard from '@/components/AgentAssistDashboard';
import type { AssistGuidance, AssistSession } from '@/lib/agentAssistEngine';

const SAMPLE = JSON.stringify({
  sessionId: 'assist-1',
  flowId: 'flow-main',
  channel: 'voice',
  agentId: 'agent-007',
  turns: [
    { speaker: 'customer', text: 'I am frustrated with this billing issue', timestamp: new Date().toISOString() },
    { speaker: 'agent', text: 'I understand. Let me verify your account details.', timestamp: new Date().toISOString() },
  ],
}, null, 2);

export default function AgentAssistPage() {
  const [input, setInput] = useState(SAMPLE);
  const [guidance, setGuidance] = useState<AssistGuidance | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parse() {
    return JSON.parse(input) as AssistSession;
  }

  async function run() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/assist/guidance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parse()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Assist guidance failed');
      setGuidance(data.guidance as AssistGuidance);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!guidance) return;
    const payload = { session: parse(), guidance };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assist-session.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>AI4 Contact Center · System #26</p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>Real-Time Agent Assist</h1>
          <AgentAssistDashboard input={input} onInputChange={setInput} guidance={guidance} busy={busy} error={error} onRun={run} onDownload={download} />
        </div>
      </main>
      <Footer />
    </>
  );
}

