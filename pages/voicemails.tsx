'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Voicemail = {
  id: string;
  interaction_id: string;
  call_sid: string;
  recording_sid: string | null;
  recording_url: string | null;
  caller_identifier: string | null;
  duration_seconds: number | null;
  transcription: string | null;
  transcription_status: string;
  callback_status: string;
  received_at: string;
  metadata?: Record<string, any>;
};

export default function VoicemailInboxPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Voicemail[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function headers() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : null;
  }

  async function refresh() {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Canonical Supabase configuration is required.');
    const auth = await headers();
    if (!auth) { await router.replace('/login'); return; }
    const res = await fetch('/api/runtime/voicemails', { headers: auth });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? 'Unable to load voicemails');
    const next = (data.voicemails ?? []) as Voicemail[];
    setRows(next);
    setSelectedId((current) => current && next.some((row) => row.id === current) ? current : next[0]?.id || '');
    setLoading(false);
  }

  async function setStatus(id: string, callback_status: string) {
    const auth = await headers();
    if (!auth) return;
    const res = await fetch('/api/runtime/voicemails', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ id, callback_status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? 'Unable to update voicemail');
    await refresh();
  }

  useEffect(() => {
    refresh().catch((e: Error) => { setError(e.message); setLoading(false); });
    const timer = window.setInterval(() => refresh().catch((e: Error) => setError(e.message)), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;

  return <>
    <Header />
    <main className="page"><div className="shell">
      <div className="heading"><div><p className="eyebrow">AI4 CONTACT CENTER · AGENT OPERATIONS</p><h1>Voicemail Inbox</h1><p>After-hours and holiday messages captured by the canonical Voice runtime.</p></div><button onClick={() => router.push('/agent-workspace')}>Agent Workspace →</button></div>
      {error && <div className="error">{error}</div>}
      {loading ? <p className="muted">Loading voicemail…</p> : <div className="layout">
        <aside>{rows.length === 0 ? <div className="empty">No voicemail messages yet.</div> : rows.map((row) => <button key={row.id} className={selected?.id === row.id ? 'active' : ''} onClick={() => setSelectedId(row.id)}><strong>{row.caller_identifier ?? 'Unknown caller'}</strong><span>{row.metadata?.temporalState ?? 'voicemail'} · {row.callback_status}</span><small>{new Date(row.received_at).toLocaleString()}</small></button>)}</aside>
        <section>{!selected ? <div className="empty">Select a voicemail.</div> : <div className="card">
          <div className="top"><div><span className="badge">VOICE MESSAGE</span><h2>{selected.caller_identifier ?? 'Unknown caller'}</h2></div><div className="meta"><span>{new Date(selected.received_at).toLocaleString()}</span><span>{selected.duration_seconds ?? 0}s</span></div></div>
          <div className="grid"><div><small>Reason</small><b>{selected.metadata?.temporalState ?? '—'}</b></div><div><small>Status</small><b>{selected.callback_status}</b></div><div><small>Destination</small><b>{selected.metadata?.destinationName ?? '—'}</b></div><div><small>Recording SID</small><b>{selected.recording_sid ?? '—'}</b></div></div>
          <div className="panel"><h3>Transcript</h3><p>{selected.transcription || (selected.transcription_status === 'pending' ? 'Transcription pending…' : 'No transcription available.')}</p></div>
          {selected.recording_url && <div className="panel"><h3>Recording</h3><audio controls src={`${selected.recording_url}.mp3`} style={{ width: '100%' }} /></div>}
          <div className="actions"><button onClick={() => router.push(`/agent-workspace?interaction=${selected.interaction_id}&channel=voice`)}>Open Interaction</button><button onClick={() => setStatus(selected.id, 'reviewed')}>Mark Reviewed</button><button onClick={() => setStatus(selected.id, 'callback_pending')}>Callback Pending</button><button onClick={() => setStatus(selected.id, 'resolved')}>Resolve</button></div>
        </div>}</section>
      </div>}
    </div></main>
    <Footer />
    <style jsx>{`
      :global(body){margin:0;background:#06111f}.page{min-height:100vh;background:#06111f;color:#e8f0fe;padding:2rem}.shell{max-width:1240px;margin:auto}.heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;flex-wrap:wrap}.heading h1{margin:.2rem 0}.heading p{color:#7891a3}.eyebrow{color:#5bd3ff!important;font-size:.65rem;font-weight:900;letter-spacing:.16em}.heading button,.actions button{border:0;border-radius:7px;background:#5bd3ff;color:#06111f;padding:.75rem 1rem;font-weight:900;cursor:pointer}.error{margin:16px 0;padding:10px;border:1px solid #8b3640;color:#ff9aa5;border-radius:8px}.muted,.empty{color:#7891a3}.layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:14px;margin-top:18px}aside{border:1px solid #17364b;border-radius:10px;overflow:hidden}aside button{display:grid;gap:5px;width:100%;text-align:left;border:0;border-bottom:1px solid #17364b;background:transparent;color:#e8f0fe;padding:12px;cursor:pointer}aside button.active{background:rgba(91,211,255,.08)}aside span,aside small{color:#7891a3}.card,.panel{border:1px solid #17364b;border-radius:10px;background:rgba(255,255,255,.02);padding:14px}.top{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.top h2{margin:.5rem 0}.badge{background:#5bd3ff;color:#06111f;padding:4px 7px;border-radius:4px;font-size:.58rem;font-weight:900}.meta{display:grid;gap:4px;color:#7891a3;font-size:.75rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin:12px 0}.grid>div{border:1px solid #17364b;border-radius:8px;padding:10px}.grid small{display:block;color:#71899b;text-transform:uppercase;font-size:.58rem}.grid b{display:block;margin-top:5px;overflow-wrap:anywhere}.panel{margin-top:10px}.panel h3{margin:0 0 8px}.panel p{line-height:1.55}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.actions button:nth-child(n+2){background:#17364b;color:#d9edf7}@media(max-width:800px){.layout{grid-template-columns:1fr}aside{max-height:300px;overflow:auto}}`}</style>
  </>;
}
