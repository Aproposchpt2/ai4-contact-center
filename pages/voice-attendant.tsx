'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CallSimulator from '@/components/CallSimulator';
import TranscriptViewer from '@/components/TranscriptViewer';
import { buildTranscript, startCall, type IvrState } from '@/lib/ivrEngine';
import type { ParsedCallFlow } from '@/lib/parser';

const EXAMPLE_JSON = `{
  "menu": "Main Menu",
  "options": [
    { "key": 1, "label": "Admissions", "queue": "Admissions_Queue" },
    { "key": 2, "label": "Financial Aid", "queue": "FinancialAid_Queue" }
  ],
  "after_hours": "Voicemail_Main",
  "holiday": "Holiday_Message"
}`;

export default function VoiceAttendantPage() {
  const [scriptInput, setScriptInput] = useState('');
  const [script, setScript] = useState<ParsedCallFlow | null>(null);
  const [ivrState, setIvrState] = useState<IvrState | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
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
      setError('Invalid JSON file. Please upload a valid .json logic model.');
    }
  }

  function handleStartSimulation() {
    setError(null);
    let parsedScript: ParsedCallFlow;
    try {
      parsedScript = JSON.parse(scriptInput) as ParsedCallFlow;
    } catch {
      setError('Script input is not valid JSON.');
      return;
    }

    if (!parsedScript.menu || !Array.isArray(parsedScript.options)) {
      setError('Script must include menu and options fields.');
      return;
    }

    const initialState = startCall(parsedScript);
    setScript(parsedScript);
    setIvrState(initialState);
    setTranscript(initialState.transcript);
    setIsSimulating(true);
  }

  function handleDownloadTranscriptTxt() {
    const blob = new Blob([transcript.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'call-transcript.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadTranscriptJson() {
    const payload = JSON.stringify(transcript, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'call-transcript.json';
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
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={eyebrowStyle}>AI4 Contact Center · Voice Attendant</p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Voice Attendant
          </h1>

          <div style={{ display: 'grid', gap: '.8rem', marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Upload Logic Model (.json)
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{ display: 'block', marginTop: '.45rem', color: 'rgba(255,255,255,.85)' }}
              />
            </label>

            <label style={labelStyle}>
              Paste JSON Logic
              <textarea
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                placeholder={EXAMPLE_JSON}
                rows={10}
                style={textareaStyle}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={handleStartSimulation} style={primaryBtn}>
              Start Simulation
            </button>
            <button
              onClick={handleDownloadTranscriptTxt}
              disabled={transcript.length === 0}
              style={{ ...secondaryBtn, opacity: transcript.length ? 1 : 0.45 }}
            >
              Download Transcript TXT
            </button>
            <button
              onClick={handleDownloadTranscriptJson}
              disabled={transcript.length === 0}
              style={{ ...secondaryBtn, opacity: transcript.length ? 1 : 0.45 }}
            >
              Download Transcript JSON
            </button>
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          {isSimulating && script && ivrState ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '.85rem' }}>
              <CallSimulator
                script={script}
                state={ivrState}
                onStateChange={(nextState) => {
                  setIvrState(nextState);
                  setTranscript(buildTranscript(nextState));
                }}
                onTranscriptChange={setTranscript}
              />
              <TranscriptViewer transcript={transcript} />
            </div>
          ) : (
            <pre style={placeholderStyle}>
              Start a simulation to view prompts, options, routing steps, and the call transcript.
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

