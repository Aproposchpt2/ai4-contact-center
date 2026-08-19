'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  assist?: {
    detected_intent: string | null;
    sentiment: string | null;
    escalation_risk: string | null;
    suggested_replies: string[];
    kb_grounding: Array<{ title?: string; snippet?: string }>;
    compliance_alerts: string[];
    next_best_actions: string[];
    model_info: Record<string, unknown>;
  } | null;
  qa?: {
    quality_score: number | null;
    compliance_score: number | null;
    flow_adherence_score: number | null;
    sentiment_score: number | null;
    flags: string[];
    scoring_method: string;
  } | null;
  compliance: Array<{ rule_code: string | null; severity: string; status: string; finding: string }>;
};

export default function AgentWorkspacePage() {
  const router = useRouter();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  async function authHeaders() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function refresh(silent = false) {
    if (!isSupabaseConfigured() || !supabase) {
      setError('Canonical Supabase configuration is required.');
      setLoading(false);
      return;
    }
    const headers = await authHeaders();
    if (!headers) {
      router.replace('/login');
      return;
    }
    const res = await fetch('/api/runtime/interactions', { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? 'Unable to load interactions');
    const rows = (data.interactions ?? []) as Interaction[];
    setInteractions(rows);
    setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id || '');
    setLastUpdated(new Date().toLocaleTimeString());
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    refresh().catch((e: Error) => { setError(e.message); setLoading(false); });
    const timer = window.setInterval(() => refresh(true).catch((e: Error) => setError(e.message)), 5000);
    return () => window.clearInterval(timer);
  }, []);

  async function runAcceptance() {
    const headers = await authHeaders();
    if (!headers) {
      router.replace('/login');
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/runtime/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Runtime acceptance failed');
      await refresh();
      setSelectedId(data.interactionId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const selected = interactions.find((item) => item.id === selectedId) ?? interactions[0] ?? null;
  const selectedIsLiveVoice = selected?.channel === 'voice' && selected?.metadata?.source === 'twilio_voice_webhook';
  const confidence = selected?.transcript?.[0]?.metadata?.confidence;

  return (
    <>
      <Header />
      <main className="workspacePage">
        <div className="workspaceShell">
          <div className="workspaceHeader">
            <div>
              <p className="eyebrow">AI4 Contact Center · Runtime</p>
              <h1>Agent Workspace</h1>
              <p className="subhead">Canonical live voice, routing, assist, transcript, QA and compliance view. Auto-refreshes every 5 seconds{lastUpdated ? ` · Updated ${lastUpdated}` : ''}.</p>
            </div>
            <button className="runButton" onClick={runAcceptance} disabled={running}>{running ? 'Running interaction…' : 'Run Development Interaction'}</button>
          </div>

          {error && <div className="errorBox">{error}</div>}

          {loading ? <p className="muted">Loading canonical runtime…</p> : (
            <div className="workspaceGrid">
              <aside className="interactionRail">
                <div className="railTitle">Recent Interactions</div>
                {interactions.length === 0 ? <div className="emptyRail">No interactions yet.</div> : interactions.map((item) => {
                  const liveVoice = item.channel === 'voice' && item.metadata?.source === 'twilio_voice_webhook';
                  return (
                    <button key={item.id} onClick={() => setSelectedId(item.id)} className={`interactionButton ${item.id === selected?.id ? 'selected' : ''}`}>
                      <div className="interactionTitleRow">
                        {liveVoice && <span className="voiceBadge">LIVE VOICE</span>}
                        <strong>{item.route?.intent ?? item.assist?.detected_intent ?? 'interaction'}</strong>
                      </div>
                      <div className="customerLine">{item.customer_identifier ?? 'Unknown customer'}</div>
                      <div className="interactionMeta"><span>{item.channel}</span><span>•</span><span>{item.status}</span><span>•</span><span>{new Date(item.started_at).toLocaleString()}</span></div>
                    </button>
                  );
                })}
              </aside>

              <section className="detailPanel">
                {!selected ? <div className="emptyState">Select or create an interaction.</div> : (
                  <div className="detailStack">
                    {selectedIsLiveVoice && <div className="liveVoiceCard">
                      <div><div className="cardLabel accent">Live Twilio Voice Interaction</div><div className="cardValue">{selected.customer_identifier ?? 'Unknown caller'}</div></div>
                      <div className="voiceMeta"><div>Call SID: <span>{selected.external_id ?? '—'}</span></div><div>Speech confidence: <span>{confidence ? `${(Number(confidence) * 100).toFixed(1)}%` : '—'}</span></div></div>
                    </div>}

                    <div className="statusGrid">
                      {[['Status', selected.status], ['Intent', selected.route?.intent ?? selected.assist?.detected_intent ?? '—'], ['Queue', selected.queue?.name ?? '—'], ['Agent', selected.agent?.name ?? '—'], ['Priority', selected.route?.priority ?? '—'], ['Escalation', selected.assist?.escalation_risk ?? '—']].map(([label, value]) => (
                        <div key={label} className="infoCard"><div className="cardLabel">{label}</div><div className="cardValue">{value}</div></div>
                      ))}
                    </div>

                    <div className="contentGrid">
                      <div className="panel transcriptPanel">
                        <h2>Transcript</h2>
                        {selected.transcript.map((turn) => <div key={`${turn.sequence_no}-${turn.speaker}`} className={`turn ${turn.speaker === 'agent' ? 'agentTurn' : ''}`}><div className={`turnLabel ${turn.speaker === 'agent' ? 'accent' : ''}`}>{turn.speaker ?? 'speaker'}</div><div className="turnText">{turn.content}</div></div>)}
                      </div>

                      <div className="rightStack">
                        <div className="panel"><h2>AI Assist</h2>{(selected.assist?.suggested_replies ?? []).map((reply) => <div key={reply} className="assistLine">• {reply}</div>)}{(selected.assist?.next_best_actions ?? []).length > 0 && <><div className="nextLabel">Next best actions</div>{selected.assist?.next_best_actions.map((action) => <div key={action} className="actionLine">→ {action}</div>)}</>}</div>
                        <div className="panel"><h2>QA</h2><div className="qaGrid">{[['Quality', selected.qa?.quality_score], ['Compliance', selected.qa?.compliance_score], ['Adherence', selected.qa?.flow_adherence_score], ['Sentiment', selected.qa?.sentiment_score]].map(([label, value]) => <div key={String(label)}><div className="qaLabel">{label}</div><div className="qaValue">{value ?? '—'}</div></div>)}</div></div>
                      </div>
                    </div>

                    {(selected.assist?.compliance_alerts?.length ?? 0) + selected.compliance.length > 0 && <div className="compliancePanel"><h2>Compliance Findings</h2>{selected.assist?.compliance_alerts?.map((alert) => <div key={alert} className="finding">⚠ {alert}</div>)}{selected.compliance.map((finding, index) => <div key={`${finding.rule_code}-${index}`} className="finding">⚠ {finding.finding}</div>)}</div>}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <style jsx>{`
        .workspacePage{min-height:100vh;background:#06111f;color:#e8f0fe;font-family:'Inter','Jost',sans-serif;padding:2rem clamp(1rem,3vw,2rem);overflow-x:hidden}.workspaceShell{max-width:1320px;margin:0 auto;min-width:0}.workspaceHeader{display:flex;justify-content:space-between;gap:1rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:1.5rem}.eyebrow{font-size:.65rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#5bd3ff;margin:0 0 .4rem}.workspaceHeader h1{margin:0;font-size:clamp(1.7rem,3vw,2.5rem);color:#fff}.subhead{color:rgba(255,255,255,.45);font-size:.86rem;margin:.45rem 0 0;line-height:1.55}.runButton{border:0;border-radius:7px;background:#5bd3ff;color:#06111f;padding:.8rem 1.15rem;font-weight:900;cursor:pointer}.runButton:disabled{opacity:.7;cursor:wait}.errorBox{margin-bottom:1rem;padding:.75rem 1rem;border:1px solid rgba(255,100,100,.3);border-radius:7px;color:#ff9090;background:rgba(255,80,80,.06)}.muted{color:rgba(255,255,255,.45)}.workspaceGrid{display:grid;grid-template-columns:minmax(240px,320px) minmax(0,1fr);gap:1rem;min-width:0}.interactionRail{border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;background:rgba(255,255,255,.025);min-width:0}.railTitle{padding:.8rem 1rem;border-bottom:1px solid rgba(255,255,255,.08);font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:800}.emptyRail{padding:1.2rem;color:rgba(255,255,255,.4);font-size:.85rem}.interactionButton{display:block;width:100%;text-align:left;padding:.9rem 1rem;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:transparent;color:#e8f0fe;cursor:pointer;min-width:0}.interactionButton.selected{background:rgba(91,211,255,.09)}.interactionTitleRow{display:flex;align-items:center;gap:.45rem;margin-bottom:.3rem;min-width:0}.interactionTitleRow strong{font-size:.84rem;overflow-wrap:anywhere}.voiceBadge{font-size:.56rem;font-weight:900;letter-spacing:.1em;color:#06111f;background:#5bd3ff;padding:.16rem .35rem;border-radius:4px;white-space:nowrap}.customerLine{font-size:.72rem;color:rgba(255,255,255,.58);margin-bottom:.2rem;overflow-wrap:anywhere}.interactionMeta{display:flex;gap:.45rem;flex-wrap:wrap;font-size:.7rem;color:rgba(255,255,255,.4)}.detailPanel,.detailStack{min-width:0}.detailStack{display:grid;gap:1rem}.emptyState{padding:3rem;border:1px dashed rgba(255,255,255,.1);border-radius:10px;color:rgba(255,255,255,.4)}.liveVoiceCard{padding:1rem;border:1px solid rgba(91,211,255,.3);border-radius:10px;background:rgba(91,211,255,.06);display:flex;gap:1rem;justify-content:space-between;flex-wrap:wrap;min-width:0}.voiceMeta{font-size:.74rem;color:rgba(255,255,255,.55);overflow-wrap:anywhere}.voiceMeta span{color:#fff}.statusGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem;min-width:0}.infoCard,.panel{padding:1rem;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.025);min-width:0}.cardLabel{font-size:.58rem;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.35);margin-bottom:.35rem;font-weight:800}.accent{color:#5bd3ff}.cardValue{font-weight:800;color:#fff;overflow-wrap:anywhere}.contentGrid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:1rem;min-width:0}.panel h2,.compliancePanel h2{margin:0 0 .75rem;font-size:1rem;color:#fff}.turn{margin-bottom:.75rem;padding:.75rem .85rem;border-radius:8px;background:rgba(255,255,255,.04);min-width:0}.agentTurn{background:rgba(91,211,255,.07)}.turnLabel{font-size:.62rem;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.4);margin-bottom:.25rem;font-weight:800}.turnText{line-height:1.55;font-size:.9rem;overflow-wrap:anywhere;word-break:break-word}.rightStack{display:grid;gap:1rem;min-width:0}.assistLine{margin-bottom:.55rem;font-size:.82rem;line-height:1.45;overflow-wrap:anywhere}.nextLabel{margin-top:.8rem;font-size:.6rem;text-transform:uppercase;letter-spacing:.12em;color:#5bd3ff;font-weight:800}.actionLine{margin-top:.35rem;font-size:.8rem;overflow-wrap:anywhere}.qaGrid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.qaLabel{font-size:.6rem;color:rgba(255,255,255,.35);text-transform:uppercase}.qaValue{font-size:1.2rem;font-weight:900;color:#fff}.compliancePanel{padding:1rem;border:1px solid rgba(255,190,80,.22);border-radius:10px;background:rgba(255,180,60,.05);min-width:0}.finding{margin-bottom:.4rem;font-size:.82rem;overflow-wrap:anywhere}
        @media(max-width:820px){.workspacePage{padding:1rem}.workspaceHeader{align-items:stretch}.runButton{width:100%}.workspaceGrid{grid-template-columns:1fr}.interactionRail{max-height:260px;overflow:auto}.railTitle{position:sticky;top:0;background:#0a1826;z-index:1}.statusGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.contentGrid{grid-template-columns:1fr}.rightStack{grid-template-columns:1fr}.subhead{font-size:.82rem}.detailPanel{width:100%}}
        @media(max-width:480px){.workspacePage{padding:.8rem}.workspaceHeader h1{font-size:2rem}.statusGrid{grid-template-columns:1fr 1fr}.infoCard,.panel,.compliancePanel{padding:.85rem}.interactionRail{max-height:220px}.interactionButton{padding:.75rem .85rem}.interactionMeta{font-size:.64rem}.contentGrid{gap:.75rem}.qaGrid{grid-template-columns:1fr 1fr}.turnText{font-size:.88rem}.liveVoiceCard{display:block}.voiceMeta{margin-top:.75rem}.cardValue{font-size:.95rem}.subhead{line-height:1.45}}
      `}</style>
    </>
  );
}
