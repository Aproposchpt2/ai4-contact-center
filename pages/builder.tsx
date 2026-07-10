'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { ParsedCallFlow } from '@/lib/parser';
import { TEMPLATES } from '@/lib/templates';
import { saveFlow } from '@/lib/storage';
import { toCiscoXml } from '@/lib/exporters/cisco';
import { toTwilioStudio } from '@/lib/exporters/twilio';
import { toGenesysArchitect } from '@/lib/exporters/genesys';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonViewer from '@/components/JsonViewer';
import FlowVisualizer from '@/components/FlowVisualizer';

type ResultWithEngine = ParsedCallFlow & { engine?: 'ai' | 'rules' };
type ViewTab = 'json' | 'visual';

const PLACEHOLDER = `Main menu: 1 for Admissions, 2 for Financial Aid, 3 for IT Helpdesk.
After hours send to voicemail.
Holidays play special message.`;

export default function BuilderPage() {
  const router = useRouter();
  const [text, setText]             = useState('');
  const [flowName, setFlowName]     = useState('');
  const [result, setResult]         = useState<ResultWithEngine | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [savedMsg, setSavedMsg]     = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [viewTab, setViewTab]       = useState<ViewTab>('visual');
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const { text: qText, name: qName } = router.query;
    if (qText && typeof qText === 'string') setText(decodeURIComponent(qText));
    if (qName && typeof qName === 'string') setFlowName(decodeURIComponent(qName));
  }, [router.query]);

  async function handleGenerate() {
    if (!text.trim()) { setError('Please describe your call flow first.'); return; }
    setLoading(true); setError(null); setResult(null); setSavedMsg(null);
    try {
      // Try AI parser first (uses rule-based fallback if OPENAI_API_KEY not set)
      const res = await fetch('/api/parse-flow-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setResult(data as ResultWithEngine);
      setViewTab('visual');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function download(content: string, filename: string, mime = 'application/json') {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function handleExport(format: 'json' | 'cisco' | 'twilio' | 'genesys') {
    if (!result) return;
    const base = (flowName || 'call-flow').replace(/\s+/g, '-').toLowerCase();
    if (format === 'json')    download(JSON.stringify(result, null, 2), `${base}.json`);
    if (format === 'cisco')   download(toCiscoXml(result, flowName || 'MainIVR'), `${base}-cisco.xml`, 'application/xml');
    if (format === 'twilio')  download(JSON.stringify(toTwilioStudio(result), null, 2), `${base}-twilio-studio.json`);
    if (format === 'genesys') download(JSON.stringify(toGenesysArchitect(result), null, 2), `${base}-genesys.json`);
    setExportOpen(false);
  }

  function handleSave() {
    if (!result || !text) return;
    saveFlow(flowName || 'Untitled Flow', text, result);
    setSavedMsg('Saved to your Dashboard!');
  }

  function loadTemplate(description: string, name: string) {
    setText(description); setFlowName(name);
    setShowTemplates(false); setResult(null); setSavedMsg(null); setError(null);
  }

  const engineBadge = result?.engine === 'ai'
    ? { label: 'GPT-4o', color: '#7c3aed', bg: 'rgba(124,58,237,.12)' }
    : result?.engine === 'rules'
    ? { label: 'Rule Engine', color: '#5bd3ff', bg: 'rgba(91,211,255,.1)' }
    : null;

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', 'Jost', sans-serif", padding: '2.5rem clamp(1.5rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ marginBottom: '1.8rem' }}>
            <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.3rem' }}>AI4 Contact Center · Script Builder</p>
            <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.1 }}>Script Builder</h1>
          </div>

          {/* Two-column layout on wide screens */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '2rem', alignItems: 'start' }}
            className="builder-grid">

            {/* ── Left: input panel ── */}
            <div>
              {/* Flow name */}
              <label style={labelStyle}>Flow Name <span style={{ color: 'rgba(255,255,255,.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input value={flowName} onChange={e => setFlowName(e.target.value)} placeholder="e.g. University Main IVR"
                style={{ ...inputStyle, marginBottom: '1rem' }} />

              {/* Template toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                <label style={labelStyle}>Describe your call flow</label>
                <button onClick={() => setShowTemplates(v => !v)} style={ghostBtn}>
                  {showTemplates ? 'Close' : '+ Template'}
                </button>
              </div>

              {/* Template picker */}
              {showTemplates && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '.5rem', marginBottom: '.8rem', padding: '.8rem', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '7px' }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => loadTemplate(t.description, t.name)}
                      style={{ background: 'rgba(91,211,255,.06)', border: '1px solid rgba(91,211,255,.14)', borderRadius: '5px', padding: '.55rem .7rem', cursor: 'pointer', textAlign: 'left', color: '#e8f0fe' }}>
                      <div style={{ fontSize: '.62rem', fontWeight: 700, color: '#5bd3ff', marginBottom: '.15rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>{t.industry}</div>
                      <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#fff' }}>{t.name}</div>
                    </button>
                  ))}
                </div>
              )}

              <textarea value={text} onChange={e => setText(e.target.value)} placeholder={PLACEHOLDER} rows={8}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.75, marginBottom: '1rem' }} />

              {/* Generate button */}
              <button onClick={handleGenerate} disabled={loading}
                style={{ width: '100%', background: '#5bd3ff', color: '#06111f', border: 'none', borderRadius: '7px', padding: '.9rem', fontWeight: 800, fontSize: '.8rem', letterSpacing: '.14em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '.7rem' }}>
                {loading ? 'Generating…' : '⚡ Generate Logic'}
              </button>

              {/* Secondary actions */}
              {result && (
                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                  <button onClick={handleSave}
                    style={{ flex: 1, ...secondaryBtn }}>
                    💾 Save
                  </button>
                  {/* Export dropdown */}
                  <div style={{ position: 'relative', flex: 1 }}>
                    <button onClick={() => setExportOpen(v => !v)} style={{ width: '100%', ...secondaryBtn }}>
                      ↓ Export {exportOpen ? '▲' : '▼'}
                    </button>
                    {exportOpen && (
                      <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#0d1e30', border: '1px solid rgba(255,255,255,.12)', borderRadius: '7px', overflow: 'hidden', zIndex: 50 }}>
                        {([
                          { f: 'json',    label: 'JSON (Universal)' },
                          { f: 'cisco',   label: 'Cisco UCCX/UCCE XML' },
                          { f: 'twilio',  label: 'Twilio Studio JSON' },
                          { f: 'genesys', label: 'Genesys Architect JSON' },
                        ] as const).map(({ f, label }) => (
                          <button key={f} onClick={() => handleExport(f)}
                            style={{ display: 'block', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '.75rem 1rem', textAlign: 'left', color: '#e8f0fe', fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(91,211,255,.07)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status messages */}
              {error    && <p style={{ ...msgStyle, color: '#ff7070', background: 'rgba(255,80,80,.07)', border: '1px solid rgba(255,80,80,.2)' }}>{error}</p>}
              {savedMsg && <p style={{ ...msgStyle, color: '#34d399', background: 'rgba(52,211,153,.07)', border: '1px solid rgba(52,211,153,.2)' }}>{savedMsg}</p>}
            </div>

            {/* ── Right: result panel ── */}
            <div>
              {result ? (
                <>
                  {/* Engine badge + stats */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.8rem', flexWrap: 'wrap', gap: '.5rem' }}>
                    <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.4)' }}>
                        Menu: <strong style={{ color: '#fff' }}>{result.menu}</strong>
                      </span>
                      <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.4)' }}>
                        Options: <strong style={{ color: '#fff' }}>{result.options.length}</strong>
                      </span>
                    </div>
                    {engineBadge && (
                      <span style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: engineBadge.color, background: engineBadge.bg, padding: '.2rem .65rem', borderRadius: '999px', border: `1px solid ${engineBadge.color}44` }}>
                        {engineBadge.label}
                      </span>
                    )}
                  </div>

                  {/* View tabs */}
                  <div style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,.06)', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
                    {(['visual', 'json'] as ViewTab[]).map(tab => (
                      <button key={tab} onClick={() => setViewTab(tab)}
                        style={{ flex: 1, padding: '.55rem', background: viewTab === tab ? 'rgba(91,211,255,.12)' : 'transparent', border: 'none', color: viewTab === tab ? '#5bd3ff' : 'rgba(255,255,255,.4)', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {tab === 'visual' ? '🌐 Visualizer' : '{ } JSON'}
                      </button>
                    ))}
                  </div>

                  {viewTab === 'visual' && <FlowVisualizer data={result} />}
                  {viewTab === 'json'   && <JsonViewer data={result} />}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', border: '1px dashed rgba(255,255,255,.08)', borderRadius: '10px', padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.4rem', marginBottom: '1rem', opacity: .35 }}>📞</div>
                  <p style={{ color: 'rgba(255,255,255,.25)', fontSize: '.88rem', lineHeight: 1.7 }}>
                    Describe your call flow on the left and click<br />
                    <strong style={{ color: 'rgba(255,255,255,.45)' }}>⚡ Generate Logic</strong> to see the result.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
      <Footer />

      {/* Responsive grid override */}
      <style>{`
        @media (max-width: 760px) {
          .builder-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

// ── Style constants ──────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '.6rem', fontWeight: 700,
  letterSpacing: '.16em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,.35)', marginBottom: '.45rem',
};
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '6px', color: '#e8f0fe', padding: '.75rem 1rem',
  fontSize: '.9rem', fontFamily: 'inherit', outline: 'none',
};
const secondaryBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.75)',
  border: '1px solid rgba(255,255,255,.14)', borderRadius: '6px',
  padding: '.65rem 1rem', fontWeight: 700, fontSize: '.72rem',
  letterSpacing: '.1em', textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: 'inherit',
};
const ghostBtn: React.CSSProperties = {
  background: 'none', border: '1px solid rgba(91,211,255,.2)',
  color: '#5bd3ff', borderRadius: '4px', padding: '.28rem .7rem',
  fontSize: '.66rem', fontWeight: 700, letterSpacing: '.1em',
  textTransform: 'uppercase', cursor: 'pointer',
};
const msgStyle: React.CSSProperties = {
  fontSize: '.84rem', marginTop: '.8rem',
  padding: '.75rem 1rem', borderRadius: '6px',
};
