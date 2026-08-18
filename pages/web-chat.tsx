'use client';
import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type Turn = { speaker: 'customer' | 'agent'; text: string };

function newSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function WebChatPage() {
  const initialSession = useMemo(() => newSessionId(), []);
  const [sessionId, setSessionId] = useState(initialSession);
  const [visitorId, setVisitorId] = useState('development-web-visitor');
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<'ready' | 'active' | 'completed'>('ready');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage() {
    const text = message.trim();
    if (!text || sending || status === 'completed') return;
    setSending(true);
    setError(null);
    setTurns((current) => [...current, { speaker: 'customer', text }]);
    setMessage('');
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', sessionId, visitorId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Unable to send message');
      setTurns((current) => [...current, { speaker: 'agent', text: data.reply }]);
      setStatus('active');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function endChat() {
    if (status === 'completed' || status === 'ready') return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', sessionId, visitorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Unable to end chat');
      setStatus('completed');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  function startNewChat() {
    setSessionId(newSessionId());
    setTurns([]);
    setMessage('');
    setStatus('ready');
    setError(null);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '.65rem', fontWeight: 900, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', margin: '0 0 .4rem' }}>AI4 Contact Center · Channel Acceptance</p>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(1.8rem,4vw,2.8rem)' }}>Live Web Chat</h1>
            <p style={{ color: 'rgba(255,255,255,.5)', lineHeight: 1.6, maxWidth: 720 }}>Development chat surface for validating canonical chat sessions, routing, Agent Assist, QA, compliance and Agent Workspace visibility.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '1rem' }}>
            <section style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, background: 'rgba(255,255,255,.025)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 900, color: '#fff' }}>AI4CC Development Chat</div>
                  <div style={{ marginTop: '.25rem', fontSize: '.72rem', color: 'rgba(255,255,255,.42)' }}>Session {sessionId.slice(0, 8)} · {status}</div>
                </div>
                <div style={{ display: 'flex', gap: '.55rem' }}>
                  <button onClick={endChat} disabled={sending || status !== 'active'} style={{ border: '1px solid rgba(255,255,255,.14)', borderRadius: 7, background: 'transparent', color: status === 'active' ? '#fff' : 'rgba(255,255,255,.3)', padding: '.6rem .8rem', fontWeight: 800, cursor: status === 'active' ? 'pointer' : 'default' }}>End Chat</button>
                  <button onClick={startNewChat} disabled={sending} style={{ border: 0, borderRadius: 7, background: '#5bd3ff', color: '#06111f', padding: '.6rem .8rem', fontWeight: 900, cursor: 'pointer' }}>New Chat</button>
                </div>
              </div>

              <div style={{ padding: '1rem', minHeight: 360, maxHeight: 520, overflowY: 'auto' }}>
                {turns.length === 0 ? (
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: 300, textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>
                    <div><div style={{ fontSize: '1rem', color: '#fff', fontWeight: 800, marginBottom: '.4rem' }}>Start a controlled web-chat interaction</div><div style={{ fontSize: '.85rem' }}>Your first message creates a canonical <strong>chat</strong> interaction in AI4CC.</div></div>
                  </div>
                ) : turns.map((turn, index) => (
                  <div key={`${turn.speaker}-${index}`} style={{ display: 'flex', justifyContent: turn.speaker === 'customer' ? 'flex-end' : 'flex-start', marginBottom: '.75rem' }}>
                    <div style={{ maxWidth: '78%', borderRadius: 12, padding: '.75rem .9rem', background: turn.speaker === 'customer' ? '#5bd3ff' : 'rgba(255,255,255,.07)', color: turn.speaker === 'customer' ? '#06111f' : '#e8f0fe' }}>
                      <div style={{ fontSize: '.58rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em', opacity: .65, marginBottom: '.3rem' }}>{turn.speaker === 'customer' ? 'Visitor' : 'AI4CC Agent'}</div>
                      <div style={{ fontSize: '.9rem', lineHeight: 1.5 }}>{turn.text}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                <label style={{ display: 'block', fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(255,255,255,.4)', marginBottom: '.4rem', fontWeight: 800 }}>Visitor ID</label>
                <input value={visitorId} onChange={(e) => setVisitorId(e.target.value)} disabled={status !== 'ready' || sending} style={{ width: '100%', boxSizing: 'border-box', marginBottom: '.7rem', borderRadius: 7, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#fff', padding: '.7rem .8rem' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '.6rem' }}>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} disabled={sending || status === 'completed'} placeholder={status === 'completed' ? 'This chat has ended. Start a new chat.' : 'Type a message…'} rows={3} style={{ resize: 'vertical', minHeight: 70, borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#fff', padding: '.8rem', fontFamily: 'inherit' }} />
                  <button onClick={sendMessage} disabled={sending || status === 'completed' || !message.trim()} style={{ alignSelf: 'stretch', border: 0, borderRadius: 8, background: '#5bd3ff', color: '#06111f', padding: '0 1.1rem', fontWeight: 900, cursor: sending ? 'wait' : 'pointer', opacity: sending || status === 'completed' || !message.trim() ? .55 : 1 }}>{sending ? 'Sending…' : 'Send'}</button>
                </div>
                {error && <div style={{ marginTop: '.7rem', color: '#ff9696', fontSize: '.82rem' }}>{error}</div>}
              </div>
            </section>

            <div style={{ padding: '1rem', borderRadius: 10, border: '1px solid rgba(91,211,255,.2)', background: 'rgba(91,211,255,.05)', color: 'rgba(255,255,255,.65)', fontSize: '.82rem', lineHeight: 1.6 }}>
              <strong style={{ color: '#5bd3ff' }}>Acceptance path:</strong> Web visitor → canonical chat interaction → queue/agent routing → transcript → Agent Assist → QA/compliance → Agent Workspace. Use <strong>End Chat</strong> to validate session completion.
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
