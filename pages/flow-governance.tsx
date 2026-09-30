'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlowGovernanceDashboard from '@/components/FlowGovernanceDashboard';
import type { GovernanceReport } from '@/lib/flowGovernanceEngine';

const SAMPLE = JSON.stringify({
  flows: [
    { id: 'flow-main', name: 'Main IVR', json: { greeting: 'hello', endpoint: 'http://legacy-api' }, ownerRole: 'supervisor', lastModifiedBy: 'jlee' },
    { id: 'flow-billing', name: 'Billing', json: { step: 'collect payment', note: 'credit card number' }, ownerRole: 'agent', lastModifiedBy: 'mtran' },
  ],
  policies: ['approval-required', 'no-public-pii', 'rbac-enforced'],
}, null, 2);

export default function FlowGovernancePage() {
  const [input, setInput] = useState(SAMPLE);
  const [report, setReport] = useState<GovernanceReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parse() {
    return JSON.parse(input) as { flows: Array<{ id: string; name: string; json: Record<string, unknown>; ownerRole?: string; lastModifiedBy?: string }>; policies?: string[] };
  }

  async function run(path: string) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parse()) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? 'Request failed');
    return data;
  }

  async function runScan() {
    setBusy(true); setError(null);
    try { await run('/api/governance/scan'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runPolicies() {
    setBusy(true); setError(null);
    try { await run('/api/governance/policies'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runReport() {
    setBusy(true); setError(null);
    try {
      const data = await run('/api/governance/report');
      setReport(data.report as GovernanceReport);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'governance-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            Intelligent Customer Engagement Operation Center · System #23
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Flow Security & Governance Engine
          </h1>
          <FlowGovernanceDashboard
            input={input}
            onInputChange={setInput}
            report={report}
            busy={busy}
            error={error}
            onScan={runScan}
            onPolicies={runPolicies}
            onReport={runReport}
            onDownload={download}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

