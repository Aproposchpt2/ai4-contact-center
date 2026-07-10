'use client';
import { useState } from 'react';
import type { ParsedCallFlow } from '@/lib/parser';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonViewer from '@/components/JsonViewer';

const PLACEHOLDER = `Main menu: 1 for Admissions, 2 for Financial Aid, 3 for IT Helpdesk.
After hours send to voicemail.
Holidays play special message.`;

export default function BuilderPage() {
  const [textInput, setTextInput] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedCallFlow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!textInput.trim()) {
      setError('Please describe your call flow.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/parse-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Failed to generate logic.');
        setParsedResult(null);
        return;
      }

      setParsedResult(data as ParsedCallFlow);
    } catch {
      setError('Network error while generating logic.');
      setParsedResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownload() {
    if (!parsedResult) return;

    const blob = new Blob([JSON.stringify(parsedResult, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'call-flow.json';
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
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
            AI4 Contact Center · Script Builder
          </p>
          <h1
            style={{
              fontSize: 'clamp(1.5rem,3vw,2.2rem)',
              fontWeight: 700,
              margin: '0 0 1.2rem 0',
              color: '#fff',
            }}
          >
            Builder
          </h1>

          <label
            style={{
              display: 'block',
              fontSize: '.7rem',
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.45)',
              marginBottom: '.5rem',
            }}
          >
            Describe your call flow
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={8}
            placeholder={PLACEHOLDER}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: '8px',
              color: '#e8f0fe',
              padding: '.9rem 1rem',
              fontSize: '.95rem',
              fontFamily: 'inherit',
              lineHeight: 1.7,
              marginBottom: '1rem',
            }}
          />

          <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              style={{
                background: '#5bd3ff',
                color: '#06111f',
                border: 'none',
                borderRadius: '7px',
                padding: '.8rem 1.2rem',
                fontWeight: 800,
                fontSize: '.78rem',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Generating…' : 'Generate Logic'}
            </button>

            <button
              onClick={handleDownload}
              disabled={!parsedResult}
              style={{
                background: 'rgba(255,255,255,.06)',
                color: 'rgba(255,255,255,.85)',
                border: '1px solid rgba(255,255,255,.16)',
                borderRadius: '7px',
                padding: '.8rem 1.2rem',
                fontWeight: 700,
                fontSize: '.76rem',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                cursor: parsedResult ? 'pointer' : 'not-allowed',
                opacity: parsedResult ? 1 : 0.5,
              }}
            >
              Download JSON
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

          {parsedResult ? (
            <JsonViewer data={parsedResult} />
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
              JSON result will appear here after you click Generate Logic.
            </pre>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
