'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VoiceAgentTestWidget from '@/components/VoiceAgentTestWidget';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type ChannelFilter = 'all' | 'voice' | 'sms' | 'chat';
type Disposition = 'resolved' | 'callback_required' | 'follow_up' | 'transferred' | 'no_action_required';
type Interaction = {
  id: string;
  channel: string;
  direction: string;
  external_id: string | null;
  customer_identifier: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  metadata?: Record<string, any>;
  queue?: { id: string; name: string; code: string } | null;
  agent?: { id: string; name: string; email: string | null; status: string } | null;
  route?: { intent: string | null; priority: string | null; reason: string | null; estimated_wait_seconds: number | null } | null;
  transcript: Array<{ speaker: string | null; sequence_no: number; content: string; sentiment: number | null; metadata?: Record<string, any> }>;
  assist?: { detected_intent: string | null; sentiment: string | null; escalation_risk: string | null; suggested_replies: string[]; kb_grounding: Array<{ title?: string; snippet?: string }>; compliance_alerts: string[]; next_best_actions: string[]; model_info: Record<string, unknown> } | null;
  qa?: { quality_score: number | null; compliance_score: number | null; flow_adherence_score: number | null; sentiment_score: number | null; flags: string[]; scoring_method: string } | null;
  compliance: Array<{ rule_code: string | null; severity: string; status: string; finding: string }>;
};

function channelLabel(channel: string, liveVoice = false) {
  if (channel === 'voice') return liveVoice ? 'LIVE VOICE' : 'VOICE';
  if (channel === 'sms') return 'SMS';
  if (channel === 'chat') return 'WEB CHAT';
  return channel.toUpperCase();
}

export default function AgentWorkspacePage() {
  const router = useRouter();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [operating, setOperating] = useState(false);
  const [disposition, setDisposition] = useState<Disposition>('resolved');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [showVoiceTest, setShowVoiceTest] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const requested = typeof router.query.channel === 'string' ? router.query.channel : 'all';
    if (requested === 'voice' || requested === 'sms' || requested === 'chat' || requested === 'all') setFilter(requested);
    if (typeof router.query.interaction === 'string') setSelectedId(router.query.interaction);
  }, [router.isReady, router.query.channel, router.query.interaction]);

  async function authHeaders() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : null;
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    if (!isSupabaseConfigured() || !supabase) { setError('Canonical Supabase configuration is required.'); setLoading(false); return; }
    const headers = await authHeaders();
    if (!headers) { setLoading(false); await router.replace('/login'); return; }
    try {
      const res = await fetch('/api/runtime/interactions', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Unable to load interactions');
      const rows = (data.interactions ?? []) as Interaction[];
      setInteractions(rows);
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id || '');
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  async function runAcceptance() {
    const headers = await authHeaders();
    if (!headers) { await router.replace('/login'); return; }
    setRunning(true); setError(null);
    try {
      const res = await fetch('/api/runtime/acceptance', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Runtime acceptance failed');
      await refresh(); setSelectedId(data.interactionId);
    } catch (e) { setError((e as Error).message); }
    finally { setRunning(false); }
  }

  async function operate(operation: 'claim' | 'callback_pending' | 'complete' | 'reopen') {
    if (!selected) return;
    const headers = await authHeaders();
    if (!headers) { await router.replace('/login'); return; }
    setOperating(true); setError(null);
    try {
      const res = await fetch('/api/runtime/interaction-operations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ interactionId: selected.id, operation, disposition: operation === 'complete' ? disposition : undefined, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Agent operation failed');
      await refresh();
      setSelectedId(selected.id);
      if (operation === 'complete') setNote('');
    } catch (e) { setError((e as Error).message); }
    finally { setOperating(false); }
  }

  const filtered = useMemo(() => filter === 'all' ? interactions : interactions.filter((item) => item.channel === filter), [interactions, filter]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const liveVoice = selected?.channel === 'voice' && selected?.metadata?.source === 'twilio_voice_webhook';
  const confidence = selected?.transcript?.[0]?.metadata?.confidence;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected?.id, selectedId]);

  return <>
    <Header />
    <main className="page"><div className="shell">
      <div className="heading"><div><p className="eyebrow">AI4 CONTACT CENTER · DEVELOPMENT OPERATIONS</p><h1>Agent Workspace</h1><p className="subhead">Unified Voice, SMS and Web Chat interactions with canonical routing, transcripts, AI Assist, QA and compliance. Heartbeat monitoring is off. Refresh only when you need a current development snapshot{lastUpdated ? ` · Last checked ${lastUpdated}` : ''}.</p></div><div className="headingActions"><button onClick={() => refresh().catch((e: Error) => setError(e.message))} disabled={loading}>{loading ? 'Checking…' : 'Refresh Interactions'}</button><button onClick={runAcceptance} disabled={running}>{running ? 'Running interaction…' : 'Run Development Interaction'}</button><button className="secondary" onClick={() => setShowVoiceTest((v) => !v)}>{showVoiceTest ? 'Hide Voice Agent Test' : 'Test Live Voice Agent'}</button></div></div>

      {showVoiceTest && <div className="panel voiceTest">
        <h3>Live Voice Agent Test</h3>
        <p className="muted">Disposable ElevenLabs test agent (<code>agent_5201m1d72hh8et8vh4w35enpvt9x</code>) wired in for connectivity testing only — not connected to the NGCC or NAT-CORP live pipelines. Use the widget below, allow microphone access when prompted, and talk.</p>
        <VoiceAgentTestWidget />
      </div>}

      <div className="filters">{(['all','voice','sms','chat'] as ChannelFilter[]).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'ALL' : channelLabel(item)}</button>)}</div>
      {error && <div className="error">{error}</div>}

      {loading ? <p className="muted">Checking canonical runtime…</p> : <div className="workspace">
        <aside className="rail"><div className="railTitle">Recent Interactions · {filtered.length}</div>{filtered.length === 0 ? <div className="empty">No snapshot loaded. Use Refresh Interactions when you want to query development data.</div> : filtered.map((item) => {
          const itemLiveVoice = item.channel === 'voice' && item.metadata?.source === 'twilio_voice_webhook';
          return <button key={item.id} onClick={() => setSelectedId(item.id)} className={item.id === selected?.id ? 'selected' : ''}><div className="rowTitle"><span className={`badge ${item.channel}`}>{channelLabel(item.channel, itemLiveVoice)}</span><strong>{item.route?.intent ?? item.assist?.detected_intent ?? 'interaction'}</strong></div><div className="customer">{item.customer_identifier ?? 'Unknown customer'}</div><div className="meta"><span>{item.status}</span><span>•</span><span>{new Date(item.started_at).toLocaleString()}</span></div></button>;
        })}</aside>

        <section className="detail">{!selected ? <div className="emptyState">Refresh interactions, then select an interaction.</div> : <div className="stack">
          <div className="channelCard"><div><span className={`badge ${selected.channel}`}>{channelLabel(selected.channel, liveVoice)}</span><h2>{selected.customer_identifier ?? 'Unknown customer'}</h2></div><div className="channelMeta">{selected.channel === 'voice' && <><div>Call SID <b>{selected.external_id ?? '—'}</b></div><div>Speech confidence <b>{confidence ? `${(Number(confidence) * 100).toFixed(1)}%` : '—'}</b></div></>}{selected.channel === 'sms' && <div>Message SID <b>{selected.external_id ?? '—'}</b></div>}{selected.channel === 'chat' && <div>Session <b>{selected.metadata?.sessionId ?? selected.external_id ?? '—'}</b></div>}</div></div>

          <div className="statusGrid">{[['Status',selected.status],['Intent',selected.route?.intent ?? selected.assist?.detected_intent ?? '—'],['Queue',selected.queue?.name ?? '—'],['Agent',selected.agent?.name ?? '—'],['Priority',selected.route?.priority ?? '—'],['Escalation',selected.assist?.escalation_risk ?? '—']].map(([label,value]) => <div className="info" key={label}><small>{label}</small><b>{value}</b></div>)}</div>

          <div className="operations panel"><div><h3>Interaction Operations</h3><p className="muted">Actions update the canonical interaction and create an immutable audit event.</p></div><div className="operationGrid"><label>Disposition<select value={disposition} onChange={(event) => setDisposition(event.target.value as Disposition)}><option value="resolved">Resolved</option><option value="callback_required">Callback Required</option><option value="follow_up">Follow Up</option><option value="transferred">Transferred</option><option value="no_action_required">No Action Required</option></select></label><label>Agent Note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional operational note" rows={3} /></label></div><div className="operationButtons">{['open','queued','active'].includes(selected.status) && <button onClick={() => operate('claim')} disabled={operating || selected.status === 'active'}>{selected.status === 'active' ? 'Claimed' : 'Claim Interaction'}</button>}<button className="secondary" onClick={() => operate('callback_pending')} disabled={operating}>Callback Pending</button>{selected.status !== 'completed' ? <button onClick={() => operate('complete')} disabled={operating}>Complete + Disposition</button> : <button className="secondary" onClick={() => operate('reopen')} disabled={operating}>Reopen Interaction</button>}</div>{selected.metadata?.agentDisposition && <div className="operationState"><small>LAST DISPOSITION</small><b>{String(selected.metadata.agentDisposition).replace(/_/g,' ')}</b>{selected.metadata?.dispositionNote && <span>{selected.metadata.dispositionNote}</span>}</div>}</div>

          <div className="content"><div className="panel"><h3>Transcript</h3>{selected.transcript.length === 0 ? <p className="muted">No transcript turns.</p> : selected.transcript.map((turn) => <div className={`turn ${turn.speaker === 'agent' ? 'agent' : ''}`} key={`${turn.sequence_no}-${turn.speaker}`}><small>{turn.speaker ?? 'speaker'}</small><p>{turn.content}</p></div>)}</div><div className="side"><div className="panel"><h3>AI Assist</h3>{(selected.assist?.suggested_replies ?? []).map((reply) => <p key={reply}>• {reply}</p>)}{(selected.assist?.next_best_actions ?? []).length > 0 && <><small className="accent">NEXT BEST ACTIONS</small>{selected.assist?.next_best_actions.map((action) => <p key={action}>→ {action}</p>)}</>}</div><div className="panel"><h3>QA</h3><div className="qa">{[['Quality',selected.qa?.quality_score],['Compliance',selected.qa?.compliance_score],['Adherence',selected.qa?.flow_adherence_score],['Sentiment',selected.qa?.sentiment_score]].map(([label,value]) => <div key={String(label)}><small>{label}</small><b>{value ?? '—'}</b></div>)}</div></div></div></div>

          {(selected.assist?.compliance_alerts?.length ?? 0) + selected.compliance.length > 0 && <div className="compliance"><h3>Compliance Findings</h3>{selected.assist?.compliance_alerts?.map((alert) => <p key={alert}>⚠ {alert}</p>)}{selected.compliance.map((finding,index) => <p key={`${finding.rule_code}-${index}`}>⚠ {finding.finding}</p>)}</div>}
        </div>}</section>
      </div>}
    </div></main>
    <Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}:global(body){margin:0;background:#06111f}.page{min-height:100vh;background:#06111f;color:#e8f0fe;padding:2rem clamp(1rem,3vw,2rem)}.shell{max-width:1320px;margin:auto}.heading{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;flex-wrap:wrap}.eyebrow{margin:0 0 6px;color:#5bd3ff;font-size:.65rem;font-weight:900;letter-spacing:.18em}.heading h1{margin:0;color:#fff;font-size:clamp(1.8rem,3vw,2.6rem)}.subhead{max-width:850px;color:#7891a3;font-size:.84rem;line-height:1.55}.headingActions{display:flex;gap:8px;flex-wrap:wrap}.headingActions button,.operationButtons button{border:0;border-radius:7px;background:#5bd3ff;color:#06111f;padding:.8rem 1.1rem;font-weight:900;cursor:pointer}.headingActions button:disabled,.operationButtons button:disabled{opacity:.6}.headingActions button.secondary{background:#17364b;color:#d9edf7}.voiceTest{margin:20px 0}.voiceTest code{background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px;font-size:.78rem}.filters{display:flex;gap:7px;flex-wrap:wrap;margin:20px 0 14px}.filters button{border:1px solid #23465f;background:rgba(255,255,255,.03);color:#91a8bb;border-radius:999px;padding:8px 13px;font-size:.68rem;font-weight:900;letter-spacing:.08em;cursor:pointer}.filters button.active{background:#5bd3ff;color:#06111f;border-color:#5bd3ff}.error{margin-bottom:14px;border:1px solid rgba(255,100,100,.3);background:rgba(255,80,80,.06);padding:11px;border-radius:8px;color:#ff9090}.muted{color:#71899b}.workspace{display:grid;grid-template-columns:minmax(250px,330px) minmax(0,1fr);gap:14px}.rail{border:1px solid #17364b;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.02)}.railTitle{padding:11px 13px;border-bottom:1px solid #17364b;font-size:.62rem;font-weight:900;letter-spacing:.12em;color:#71899b}.rail>button{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #102d42;background:transparent;color:#d8eaf4;padding:12px;cursor:pointer}.rail>button.selected{background:rgba(91,211,255,.08)}.rowTitle{display:flex;gap:7px;align-items:center}.rowTitle strong{font-size:.8rem;overflow-wrap:anywhere}.badge{display:inline-block;border-radius:4px;padding:3px 6px;font-size:.55rem;font-weight:900;letter-spacing:.08em;background:#5bd3ff;color:#06111f}.badge.sms{background:#8df0c2}.badge.chat{background:#c6a8ff}.customer{margin-top:5px;font-size:.71rem;color:#91a8bb}.meta{display:flex;gap:5px;margin-top:4px;font-size:.65rem;color:#617b8e}.empty{padding:18px;color:#71899b;font-size:.8rem}.detail,.stack{min-width:0}.stack{display:grid;gap:12px}.emptyState{padding:3rem;border:1px dashed #17364b;border-radius:10px;color:#71899b}.channelCard{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border:1px solid #1b435d;border-radius:10px;padding:15px;background:rgba(91,211,255,.04)}.channelCard h2{margin:8px 0 0;font-size:1.15rem}.channelMeta{font-size:.7rem;color:#7891a3;display:grid;gap:5px}.channelMeta b{color:#d6e8f3;overflow-wrap:anywhere}.statusGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px}.info,.panel{border:1px solid #17364b;border-radius:9px;padding:13px;background:rgba(255,255,255,.02)}small{font-size:.58rem;font-weight:900;letter-spacing:.1em;color:#71899b;text-transform:uppercase}.info b{display:block;margin-top:5px;color:#fff;overflow-wrap:anywhere}.operations h3{margin:0 0 5px}.operations p{margin:0}.operationGrid{display:grid;grid-template-columns:minmax(180px,.35fr) minmax(0,1fr);gap:10px;margin-top:12px}.operationGrid label{display:grid;gap:6px;color:#91a8bb;font-size:.7rem;font-weight:800}.operationGrid select,.operationGrid textarea{width:100%;background:#0a1d2c;color:#e8f0fe;border:1px solid #23465f;border-radius:7px;padding:9px;font:inherit}.operationGrid textarea{resize:vertical}.operationButtons{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.operationButtons button.secondary{background:#17364b;color:#d9edf7}.operationState{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #17364b}.operationState b{text-transform:capitalize}.operationState span{color:#91a8bb;font-size:.72rem}.content{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(270px,.75fr);gap:12px}.panel h3,.compliance h3{margin:0 0 10px;color:#fff;font-size:.95rem}.turn{margin:0 0 8px;background:rgba(255,255,255,.035);border-radius:7px;padding:10px}.turn.agent{background:rgba(91,211,255,.06)}.turn p,.panel p,.compliance p{font-size:.8rem;line-height:1.5;overflow-wrap:anywhere}.side{display:grid;gap:12px;align-content:start}.accent{color:#5bd3ff}.qa{display:grid;grid-template-columns:1fr 1fr;gap:10px}.qa b{display:block;margin-top:4px;font-size:1.15rem}.compliance{border:1px solid rgba(255,190,80,.25);background:rgba(255,180,60,.05);border-radius:9px;padding:13px}@media(max-width:840px){.workspace{grid-template-columns:1fr}.rail{max-height:290px;overflow:auto}.content{grid-template-columns:1fr}.headingActions{width:100%}.headingActions button{flex:1}.operationGrid{grid-template-columns:1fr}}`}</style>
  </>;
}
