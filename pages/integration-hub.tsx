'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import IntegrationHubDashboard from '@/components/IntegrationHubDashboard';

const SAMPLE = JSON.stringify({
  systems: [
    { id: 'crm-1', name: 'Salesforce', type: 'crm', endpoint: 'https://api.salesforce.example.com', enabled: true },
    { id: 'ticket-1', name: 'ServiceNow', type: 'ticketing', endpoint: 'https://api.servicenow.example.com', enabled: true },
  ],
  workflows: [
    { id: 'wf-1', name: 'Case escalation sync', steps: ['ingest', 'transform', 'dispatch'] },
  ],
}, null, 2);

export default function IntegrationHubPage() {
  const [input, setInput] = useState(SAMPLE);
  const [config, setConfig] = useState<{
    systems: Array<{ id: string; name: string; type: string; endpoint: string; enabled: boolean }>;
    workflows: Array<{ id: string; name: string; steps: string[] }>;
    exportedAt: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    try {
      const payload = JSON.parse(input);
      const response = await fetch('/api/integration/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Integration export failed');
      setConfig(data);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'integration-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>AI4 Contact Center · System #30</p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>Enterprise Orchestration & Integration Hub</h1>
          <IntegrationHubDashboard input={input} onInputChange={setInput} config={config} busy={busy} error={error} onRun={run} onDownload={download} />
        </div>
      </main>
      <Footer />
    </>
  );
}

