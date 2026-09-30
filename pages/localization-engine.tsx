'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LocalizationDashboard from '@/components/LocalizationDashboard';
import type { LocalizationResult } from '@/lib/localizationEngine';

const SAMPLE = JSON.stringify({
  sourceLanguage: 'en',
  targetLanguage: 'es',
  items: [
    { id: 'm1', text: 'Welcome to support. Please choose an option.', type: 'flow-message' },
    { id: 'm2', text: 'Your ticket number is {ticketId}.', type: 'prompt' },
  ],
}, null, 2);

export default function LocalizationEnginePage() {
  const [input, setInput] = useState(SAMPLE);
  const [result, setResult] = useState<LocalizationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parse() {
    return JSON.parse(input) as { sourceLanguage: string; targetLanguage: string; items: Array<{ id: string; text: string; type: 'flow-message' | 'kb-article' | 'prompt' | 'transcript' }> };
  }

  async function run(path: string) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parse()) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? 'Request failed');
    return data;
  }

  async function runTranslate() {
    setBusy(true); setError(null);
    try { const data = await run('/api/localization/translate'); setResult(data.result as LocalizationResult); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runValidate() {
    setBusy(true); setError(null);
    try { await run('/api/localization/validate'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runExport() {
    setBusy(true); setError(null);
    try {
      const data = await run('/api/localization/export');
      const translated = data.localizedFlow.map((entry: { id: string; original: string; translated: string; warnings: string[] }) => entry);
      setResult({
        sourceLanguage: parse().sourceLanguage,
        targetLanguage: parse().targetLanguage,
        translations: translated,
        validation: data.validation,
      });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'localized-flow.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            Intelligent Customer Engagement Operation Center · System #24
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Multi-Language Localization & Translation Engine
          </h1>
          <LocalizationDashboard
            input={input}
            onInputChange={setInput}
            result={result}
            busy={busy}
            error={error}
            onTranslate={runTranslate}
            onValidate={runValidate}
            onExport={runExport}
            onDownload={download}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

