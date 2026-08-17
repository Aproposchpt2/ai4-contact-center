'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { ParsedCallFlow } from '@/lib/parser';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonViewer from '@/components/JsonViewer';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const PLACEHOLDER = `Main menu: 1 for Admissions, 2 for Financial Aid, 3 for IT Helpdesk.
After hours send to voicemail.
Holidays play special message.`;

type GeneratedFlow = ParsedCallFlow & { engine?: 'ai' | 'rules' };

export default function BuilderPage() {
  const router = useRouter();
  const [flowName, setFlowName] = useState('Untitled Flow');
  const [textInput, setTextInput] = useState('');
  const [parsedResult, setParsedResult] = useState<GeneratedFlow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof router.query.text === 'string') setTextInput(router.query.text);
    if (typeof router.query.name === 'string' && router.query.name.trim()) setFlowName(router.query.name);
  }, [router.isReady, router.query.text, router.query.name]);

  async function handleGenerate() {
    if (!textInput.trim()) {
      setError('Please describe your call flow.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/parse-flow-ai', {
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

      setParsedResult(data as GeneratedFlow);
    } catch {
      setError('Network error while generating logic.');
      setParsedResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!parsedResult) return;
    if (!isSupabaseConfigured() || !supabase) {
      setError('Canonical Supabase configuration is required to save flows.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsSaving(false);
      router.push('/login');
      return;
    }

    const { engine = 'rules', ...definition } = parsedResult;

    try {
      const response = await fetch('/api/save-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: flowName.trim() || 'Untitled Flow',
          text: textInput,
          parsed: definition,
          engine,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Unable to save the flow.');
        return;
      }

      setSaveMessage(`Saved as canonical flow v${data.version}.`);
    } catch {
      setError('Network error while saving the flow.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDownload() {
    if (!parsedResult) return;
    const blob = new Blob([JSON.stringify(parsedResult, null, 2)], { type: 'application/json' });
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
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', 'Jost', sans-serif", padding: '2rem clamp(1rem, 4vw, 3rem)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            AI4 Contact Center · Canonical Script Builder
          </p>
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 700, margin: '0 0 1.2rem 0', color: '#fff' }}>
            Builder
          </h1>

          <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: '.5rem' }}>
            Flow name
          </label>
          <input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px', color: '#e8f0fe', padding: '.8rem 1rem', fontSize: '.95rem', fontFamily: 'inherit', marginBottom: '1rem' }}
          />

          <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: '.5rem' }}>
            Describe your call flow
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={8}
            placeholder={PLACEHOLDER}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px', color: '#e8f0fe', padding: '.9rem 1rem', fontSize: '.95rem', fontFamily: 'inherit', lineHeight: 1.7, marginBottom: '1rem' }}
          />

          <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={handleGenerate} disabled={isLoading} style={{ background: '#5bd3ff', color: '#06111f', border: 'none', borderRadius: '7px', padding: '.8rem 1.2rem', fontWeight: 800, fontSize: '.78rem', letterSpacing: '.12em', textTransform: 'uppercase', cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Generating…' : 'Generate Logic'}
            </button>

            <button onClick={handleSave} disabled={!parsedResult || isSaving} style={{ background: parsedResult ? '#8df0c2' : 'rgba(255,255,255,.06)', color: parsedResult ? '#06111f' : 'rgba(255,255,255,.4)', border: '1px solid rgba(255,255,255,.16)', borderRadius: '7px', padding: '.8rem 1.2rem', fontWeight: 800, fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: parsedResult && !isSaving ? 'pointer' : 'not-allowed' }}>
              {isSaving ? 'Saving…' : 'Save to Dashboard'}
            </button>

            <button onClick={handleDownload} disabled={!parsedResult} style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.85)', border: '1px solid rgba(255,255,255,.16)', borderRadius: '7px', padding: '.8rem 1.2rem', fontWeight: 700, fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: parsedResult ? 'pointer' : 'not-allowed', opacity: parsedResult ? 1 : 0.5 }}>
              Download JSON
            </button>
          </div>

          {parsedResult?.engine && (
            <p style={{ margin: '0 0 1rem', color: 'rgba(255,255,255,.45)', fontSize: '.76rem' }}>
              Parser engine: <strong style={{ color: '#5bd3ff' }}>{parsedResult.engine === 'ai' ? 'AI' : 'Rules fallback'}</strong>
            </p>
          )}

          {saveMessage && (
            <p style={{ margin: '0 0 1rem', color: '#8df0c2', background: 'rgba(80,220,160,.07)', border: '1px solid rgba(80,220,160,.22)', borderRadius: '7px', padding: '.7rem .9rem', fontSize: '.88rem' }}>
              {saveMessage} <button onClick={() => router.push('/dashboard')} style={{ marginLeft: '.5rem', background: 'none', border: 'none', color: '#5bd3ff', cursor: 'pointer', fontWeight: 700 }}>Open dashboard →</button>
            </p>
          )}

          {error && (
            <p style={{ margin: '0 0 1rem 0', color: '#ff8585', background: 'rgba(255,80,80,.07)', border: '1px solid rgba(255,80,80,.24)', borderRadius: '7px', padding: '.7rem .9rem', fontSize: '.88rem' }}>
              {error}
            </p>
          )}

          {parsedResult ? (
            <JsonViewer data={parsedResult} />
          ) : (
            <pre style={{ margin: 0, borderRadius: '8px', border: '1px dashed rgba(255,255,255,.15)', color: 'rgba(255,255,255,.34)', padding: '1.2rem', background: 'rgba(255,255,255,.01)', fontSize: '.85rem' }}>
              JSON result will appear here after you click Generate Logic.
            </pre>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
