'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import QualityAssuranceDashboard from '@/components/QualityAssuranceDashboard';
import type { QAReport, QAScorecard } from '@/lib/qualityAssuranceEngine';

const SAMPLE = JSON.stringify({
  transcripts: [
    { id: 't1', agent: 'Maya Tran', text: 'I understand the issue and can help verify your account.', sentiment: 0.2, outcome: 'resolved' },
    { id: 't2', agent: 'Jordan Lee', text: 'Please provide your credit card number to continue.', sentiment: -0.4, outcome: 'unresolved' },
  ],
  complianceRules: ['PCI', 'Verification', 'HIPAA'],
}, null, 2);

export default function QualityAssurancePage() {
  const [input, setInput] = useState(SAMPLE);
  const [scorecards, setScorecards] = useState<QAScorecard[]>([]);
  const [report, setReport] = useState<QAReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parse() {
    return JSON.parse(input) as { transcripts: Array<{ id: string; agent: string; text: string; sentiment?: number; outcome?: 'resolved' | 'unresolved' }>; complianceRules?: string[] };
  }

  async function runScore() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/qa/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parse()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Scoring failed');
      setScorecards(data.scorecards as QAScorecard[]);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runCompliance() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/qa/compliance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parse()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Compliance failed');
      if (report) setReport({ ...report, complianceFindings: data.compliance });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runReport() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/qa/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parse()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'QA report failed');
      setReport(data.report as QAReport);
      setScorecards((data.report as QAReport).scorecards);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qa-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            Intelligent Customer Engagement Operation Center · System #21
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Quality Assurance Auto-Scoring & Compliance Engine
          </h1>
          <QualityAssuranceDashboard
            input={input}
            onInputChange={setInput}
            scorecards={scorecards}
            report={report}
            busy={busy}
            error={error}
            onScore={runScore}
            onCompliance={runCompliance}
            onReport={runReport}
            onDownload={download}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

