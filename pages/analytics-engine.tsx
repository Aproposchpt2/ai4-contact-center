'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import type { AnalyticsInput, AnalyticsReport } from '@/lib/analyticsEngine';

const EXAMPLE_JSON = `{
  "menu": "Main Menu",
  "options": [
    { "key": 1, "label": "Admissions", "queue": "Admissions_Queue" },
    { "key": 2, "label": "Financial Aid", "queue": "Admissions_Queue" }
  ],
  "holiday": null,
  "warnings": ["After-hours logic not defined."],
  "errors": [],
  "recommendations": ["Add holiday routing."]
}`;

export default function AnalyticsEnginePage() {
  const [inputData, setInputData] = useState('');
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setInputData(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError('Invalid JSON file. Please upload a valid .json payload.');
    }
  }

  async function handleAnalyze() {
    setError(null);
    setAnalyticsResult(null);

    let parsedScript: AnalyticsInput;
    try {
      parsedScript = JSON.parse(inputData) as AnalyticsInput;
    } catch {
      setError('Input is not valid JSON.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/analyze-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: parsedScript }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Failed to analyze data.');
        return;
      }
      setAnalyticsResult(data as AnalyticsReport);
    } catch {
      setError('Network error while analyzing data.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownloadAnalytics() {
    if (!analyticsResult) return;
    const blob = new Blob([JSON.stringify(analyticsResult, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'analytics.json';
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
          <p style={eyebrowStyle}>Stellar Unified Communications · Analytics Engine</p>
          <h1 style={{ margin: '0 0 1.1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Analytics Engine
          </h1>

          <div style={{ display: 'grid', gap: '.9rem', marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Upload Data (.json)
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{ display: 'block', marginTop: '.45rem', color: 'rgba(255,255,255,.85)' }}
              />
            </label>

            <label style={labelStyle}>
              Paste JSON Data
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder={EXAMPLE_JSON}
                rows={12}
                style={textareaStyle}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={handleAnalyze} disabled={isLoading} style={primaryBtn}>
              {isLoading ? 'Analyzing...' : 'Analyze Data'}
            </button>
            <button
              onClick={handleDownloadAnalytics}
              disabled={!analyticsResult}
              style={{ ...secondaryBtn, opacity: analyticsResult ? 1 : 0.45 }}
            >
              Download Analytics
            </button>
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          {analyticsResult ? (
            <AnalyticsDashboard report={analyticsResult} />
          ) : (
            <pre style={placeholderStyle}>
              Analytics metrics, insights, and recommendations will appear here after you click Analyze Data.
            </pre>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

const eyebrowStyle: React.CSSProperties = {
  fontSize: '.66rem',
  fontWeight: 700,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: '#5bd3ff',
  marginBottom: '.4rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.78rem',
  fontWeight: 700,
  color: 'rgba(255,255,255,.8)',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: '.45rem',
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
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  margin: '0 0 1rem 0',
  color: '#ff8585',
  background: 'rgba(255,80,80,.07)',
  border: '1px solid rgba(255,80,80,.24)',
  borderRadius: '7px',
  padding: '.7rem .9rem',
  fontSize: '.88rem',
};

const placeholderStyle: React.CSSProperties = {
  margin: 0,
  borderRadius: '8px',
  border: '1px dashed rgba(255,255,255,.15)',
  color: 'rgba(255,255,255,.34)',
  padding: '1.2rem',
  background: 'rgba(255,255,255,.01)',
  fontSize: '.85rem',
};

