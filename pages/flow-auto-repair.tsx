'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlowAutoRepairDashboard from '@/components/FlowAutoRepairDashboard';
import type { FlowModel, FlowRepairResult } from '@/lib/flowRepairEngine';

const EXAMPLE_FLOW = `{
  "options": [
    { "key": 1, "label": "Admissions", "queue": "Admissions Queue" },
    { "key": 2, "label": "Support" }
  ],
  "nodes": [
    { "id": "menu-1", "type": "menu", "label": "Main Menu" },
    { "id": "orphan-1", "type": "queue", "label": "Unused Queue" }
  ],
  "edges": []
}`;

export default function FlowAutoRepairPage() {
  const [inputJson, setInputJson] = useState(EXAMPLE_FLOW);
  const [result, setResult] = useState<FlowRepairResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setInputJson(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError('Invalid JSON file. Please upload a valid flow model.');
    }
  }

  async function handleAnalyzeRepair() {
    setError(null);
    setResult(null);
    let flow: FlowModel;
    try {
      flow = JSON.parse(inputJson) as FlowModel;
    } catch {
      setError('Flow JSON is invalid.');
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch('/api/repair-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Failed to repair flow.');
        return;
      }
      setResult(data as FlowRepairResult);
    } catch {
      setError('Network error while repairing flow.');
    } finally {
      setIsRunning(false);
    }
  }

  function handleDownloadFlow() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.optimizedFlow, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'repaired-flow.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadDiff() {
    if (!result) return;
    const diffPayload = {
      issues: result.issues,
      fixes: result.fixes,
      diff: result.diff,
      summary: result.summary,
      recommendations: result.recommendations,
    };
    const blob = new Blob([JSON.stringify(diffPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main
        style={{
          minHeight: '100vh',
          background: '#06111f',
          color: '#e8f0fe',
          fontFamily: "'Inter', 'Jost', sans-serif",
          padding: '2rem clamp(1rem, 4vw, 3rem)',
        }}
      >
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            Intelligent Customer Engagement Operation Center · Flow Auto-Repair & Optimization
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Flow Auto-Repair
          </h1>

          <FlowAutoRepairDashboard
            inputJson={inputJson}
            onInputJsonChange={setInputJson}
            onFileUpload={handleFileUpload}
            onAnalyzeRepair={handleAnalyzeRepair}
            onDownloadFlow={handleDownloadFlow}
            onDownloadDiff={handleDownloadDiff}
            isRunning={isRunning}
            result={result}
            error={error}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

