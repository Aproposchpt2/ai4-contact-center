'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { ParsedCallFlow } from '@/lib/parser';
import { TEMPLATES } from '@/lib/templates';
import { saveFlow } from '@/lib/storage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonViewer from '@/components/JsonViewer';

const PLACEHOLDER = `Main menu: 1 for Admissions, 2 for Financial Aid, 3 for IT Helpdesk.
After hours send to voicemail.
Holidays play special message.`;

export default function BuilderPage() {
  const router = useRouter();
  const [text, setText]             = useState('');
  const [flowName, setFlowName]     = useState('');
  const [result, setResult]         = useState<ParsedCallFlow | null>(null);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [savedMsg, setSavedMsg]     = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Support ?text= query param (from templates / dashboard re-open)
  useEffect(() => {
    const { text: qText, name: qName } = router.query;
    if (qText && typeof qText === 'string') setText(decodeURIComponent(qText));
    if (qName && typeof qName === 'string') setFlowName(decodeURIComponent(qName));
  }, [router.query]);

  async function handleGenerate() {
    if (!text.trim()) { setError('Please describe your call flow first.'); return; }
    setLoading(true); setError(null); setResult(null); setSavedMsg(null);
    try {
      const res = await fetch('/api/parse-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setResult(data as ParsedCallFlow);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${flowName || 'call-flow'}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleSave() {
    if (!result || !text) return;
    setSaving(true);
    try {
      saveFlow(flowName || 'Untitled Flow', text, result);
      setSavedMsg('Flow saved to your Dashboard!');
    } finally {
      setSaving(false);
    }
  }

  function loadTemplate(description: string, name?: string) {
    setText(description);
    if (name) setFlowName(name);
    setShowTemplates(false);
    setResult(null); setSavedMsg(null); setError(null);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', 'Jost', sans-serif", padding: '3rem clamp(1.5rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
              AI4 Contact Center · AI Script Builder
            </p>
            <h1 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 700, lineHeight: 1.1, margin: 0, color: '#fff' }}>
              Script Builder
            </h1>
            <p style={{ color: 'rgba(255,255,255,.45)', marginTop: '.5rem', fontSize: '.88rem' }}>
              Describe your call flow in plain English — get structured JSON logic instantly.
            </p>
          </div>

          {/* Flow name */}
          <label style={{ display: 'block', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '.5rem' }}>
            Flow Name <span style={{ color: 'rgba(255,255,255,.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </label>
          <input
            value={flowName}
            onChange={e => setFlowName(e.target.value)}
            placeholder="e.g. University Main IVR"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
              borderRadius: '6px', color: '#e8f0fe', padding: '.7rem 1rem',
              fontSize: '.9rem', fontFamily: 'inherit', outline: 'none', marginBottom: '1rem',
            }}
          />

          {/* Templates strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
            <label style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)' }}>
              Describe your call flow
            </label>
            <button
              onClick={() => setShowTemplates(v => !v)}
              style={{ background: 'none', border: '1px solid rgba(91,211,255,.25)', color: '#5bd3ff', borderRadius: '5px', padding: '.3rem .8rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              {showTemplates ? 'Close Templates' : '+ Load Template'}
            </button>
          </div>

          {/* Template picker */}
          {showTemplates && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.6rem', marginBottom: '1rem', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '8px', padding: '1rem' }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => loadTemplate(t.description, t.name)}
                  style={{
                    background: 'rgba(91,211,255,.06)', border: '1px solid rgba(91,211,255,.15)',
                    borderRadius: '6px', padding: '.7rem .9rem', cursor: 'pointer',
                    textAlign: 'left', color: '#e8f0fe',
                  }}
                >
                  <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#5bd3ff', marginBottom: '.2rem' }}>{t.industry}</div>
                  <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#fff' }}>{t.name}</div>
                </button>
              ))}
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={7}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
              borderRadius: '8px', color: '#e8f0fe',
              padding: '1rem 1.1rem', fontSize: '.95rem',
              fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical',
              outline: 'none', marginBottom: '1rem',
            }}
          />

          {/* Action row */}
          <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap', marginBottom: '1.6rem' }}>
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                background: '#5bd3ff', color: '#06111f',
                border: 'none', borderRadius: '6px', padding: '.8rem 1.8rem',
                fontWeight: 800, fontSize: '.78rem', letterSpacing: '.14em', textTransform: 'uppercase',
                cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Generating…' : 'Generate Logic →'}
            </button>

            {result && (
              <>
                <button onClick={handleDownload} style={{ background: 'rgba(255,255,255,.07)', color: '#fff', border: '1px solid rgba(255,255,255,.18)', borderRadius: '6px', padding: '.8rem 1.4rem', fontWeight: 700, fontSize: '.76rem', letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Download JSON ↓
                </button>
                <button onClick={handleSave} disabled={saving} style={{ background: 'rgba(91,211,255,.1)', color: '#5bd3ff', border: '1px solid rgba(91,211,255,.2)', borderRadius: '6px', padding: '.8rem 1.4rem', fontWeight: 700, fontSize: '.76rem', letterSpacing: '.12em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer' }}>
                  {saving ? 'Saving…' : 'Save to Dashboard'}
                </button>
              </>
            )}
          </div>

          {/* Status messages */}
          {error && (
            <p style={{ color: '#ff7070', fontSize: '.86rem', marginBottom: '1rem', padding: '.8rem 1rem', background: 'rgba(255,80,80,.07)', borderRadius: '6px', border: '1px solid rgba(255,80,80,.2)' }}>
              {error}
            </p>
          )}
          {savedMsg && (
            <p style={{ color: '#34d399', fontSize: '.86rem', marginBottom: '1rem', padding: '.8rem 1rem', background: 'rgba(52,211,153,.07)', borderRadius: '6px', border: '1px solid rgba(52,211,153,.2)' }}>
              {savedMsg}
            </p>
          )}

          {/* Result */}
          {result && (
            <div>
              <p style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '.6rem' }}>
                Parsed Call Flow Logic
              </p>

              {/* Stats bar */}
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', padding: '.8rem 1rem', background: 'rgba(91,211,255,.05)', borderRadius: '6px', border: '1px solid rgba(91,211,255,.1)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '.76rem', color: '#5bd3ff' }}>Menu: <strong style={{ color: '#fff' }}>{result.menu}</strong></span>
                <span style={{ fontSize: '.76rem', color: '#5bd3ff' }}>Options: <strong style={{ color: '#fff' }}>{result.options.length}</strong></span>
                <span style={{ fontSize: '.76rem', color: '#5bd3ff' }}>After Hours: <strong style={{ color: '#fff' }}>{result.after_hours || '—'}</strong></span>
                <span style={{ fontSize: '.76rem', color: '#5bd3ff' }}>Holiday: <strong style={{ color: '#fff' }}>{result.holiday || '—'}</strong></span>
              </div>

              <JsonViewer data={result} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
