'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ComplianceAutomationDashboard from '@/components/ComplianceAutomationDashboard';

const SAMPLE = JSON.stringify({
  rules: [
    { id: 'rule-pci', name: 'No full card numbers', target: 'transcript', pattern: 'credit card number', severity: 'high' },
    { id: 'rule-verify', name: 'Verification required', target: 'agent', pattern: 'verify', severity: 'medium' },
  ],
  assets: [
    { id: 'tr-1', type: 'transcript', content: 'Customer shared credit card number in full' },
    { id: 'ag-1', type: 'agent', content: 'Resolved request without verify step' },
  ],
}, null, 2);

export default function ComplianceAutomationPage() {
  const [input, setInput] = useState(SAMPLE);
  const [report, setReport] = useState<{
    rules: Array<{ id: string; name: string; target: string; pattern: string; severity: string }>;
    violations: Array<{ ruleId: string; assetId: string; severity: string; message: string }>;
    recommendations: string[];
    summary: { totalRules: number; scannedAssets: number; violations: number; highSeverity: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    try {
      const payload = JSON.parse(input);
      const response = await fetch('/api/compliance/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Compliance report failed');
      setReport(data.report);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compliance-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>AI4 Contact Center · System #29</p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>Compliance Automation & Policy Enforcement</h1>
          <ComplianceAutomationDashboard input={input} onInputChange={setInput} report={report} busy={busy} error={error} onRun={run} onDownload={download} />
        </div>
      </main>
      <Footer />
    </>
  );
}

