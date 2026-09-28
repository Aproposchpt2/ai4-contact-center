'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RoutingReportViewer from '@/components/RoutingReportViewer';
import type { RoutingReport, RoutingScript } from '@/lib/routingAnalyzer';

const EXAMPLE_JSON = `{
  "menu": "Main Menu",
  "options": [
    { "key": 1, "label": "Admissions", "queue": "Admissions_Queue" }
  ],
  "after_hours": "Voicemail_Main",
  "holiday": "Holiday_Message"
}`;

export default function RoutingOptimizerPage() {
  const [scriptInput, setScriptInput] = useState('');
  const [optimizationResult, setOptimizationResult] = useState<RoutingReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setScriptInput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError('Invalid JSON file. Please upload a valid .json script.');
    }
  }

  async function handleOptimize() {
    setError(null);
    setOptimizationResult(null);

    let parsedScript: RoutingScript;
    try {
      parsedScript = JSON.parse(scriptInput) as RoutingScript;
    } catch {
      setError('Script input is not valid JSON.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/optimize-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: parsedScript }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Failed to optimize routing.');
        return;
      }
      setOptimizationResult(data as RoutingReport);
    } catch {
      setError('Network error while optimizing routing.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownload() {
    if (!optimizationResult) return;
    const blob = new Blob([JSON.stringify(optimizationResult, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'routing-optimization.json';
    link.click();
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
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <p
            style={{
              fontSize: '.66rem',
              fontWeight: 700,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: '#5bd3ff',
              marginBottom: '.4rem',
            }}
          >
            Stellar Unified Communications · Routing Optimizer
          </p>
          <h1 style={{ margin: '0 0 1.2rem 0', fontSize: 'clamp(1.5rem,3vw,2.2rem)', color: '#fff' }}>
            Routing Optimizer
          </h1>

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Upload Script (.json)
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{ display: 'block', marginTop: '.5rem', color: 'rgba(255,255,255,.85)' }}
              />
            </label>

            <label style={labelStyle}>
              Paste JSON Script
              <textarea
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                placeholder={EXAMPLE_JSON}
                rows={12}
                style={textareaStyle}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={handleOptimize} disabled={isLoading} style={primaryBtn}>
              {isLoading ? 'Optimizing...' : 'Optimize Routing'}
            </button>
            <button
              onClick={handleDownload}
              disabled={!optimizationResult}
              style={{ ...secondaryBtn, opacity: optimizationResult ? 1 : 0.5, cursor: optimizationResult ? 'pointer' : 'not-allowed' }}
            >
              Download Report
            </button>
          </div>

          {error && (
            <p
              style={{
                margin: '0 0 1rem 0',
                color: '#ff8585',
                background: 'rgba(255,80,80,.07)',
                border: '1px solid rgba(255,80,80,.24)',
                borderRadius: '7px',
                padding: '.7rem .9rem',
                fontSize: '.88rem',
              }}
            >
              {error}
            </p>
          )}

          {optimizationResult ? (
            <RoutingReportViewer report={optimizationResult} />
          ) : (
            <pre
              style={{
                margin: 0,
                borderRadius: '8px',
                border: '1px dashed rgba(255,255,255,.15)',
                color: 'rgba(255,255,255,.34)',
                padding: '1.2rem',
                background: 'rgba(255,255,255,.01)',
                fontSize: '.85rem',
              }}
            >
              Routing optimization report will appear here after you click Optimize Routing.
            </pre>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.78rem',
  fontWeight: 700,
  color: 'rgba(255,255,255,.8)',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: '.5rem',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: '8px',
  color: '#e8f0fe',
  padding: '.9rem 1rem',
  fontSize: '.9rem',
  fontFamily: "'Fira Mono', 'Courier New', monospace",
  lineHeight: 1.6,
};

const primaryBtn: React.CSSProperties = {
  background: '#5bd3ff',
  color: '#06111f',
  border: 'none',
  borderRadius: '7px',
  padding: '.8rem 1.2rem',
  fontWeight: 800,
  fontSize: '.78rem',
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)',
  color: 'rgba(255,255,255,.85)',
  border: '1px solid rgba(255,255,255,.16)',
  borderRadius: '7px',
  padding: '.8rem 1.2rem',
  fontWeight: 700,
  fontSize: '.76rem',
  letterSpacing: '.1em',
  textTransform: 'uppercase',
};

