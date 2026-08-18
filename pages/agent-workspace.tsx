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
  customer_identifier: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  queue?: { id: string; name: string; code: string } | null;
  agent?: { id: string; name: string; email: string | null; status: string } | null;
  route?: { intent: string | null; priority: string | null; reason: string | null; estimated_wait_seconds: number | null } | null;
  transcript: Array<{ speaker: string | null; sequence_no: number; content: string; sentiment: number | null }>;
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
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function authHeaders() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function refresh() {
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
    setSelectedId((current) => current || rows[0]?.id || '');
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch((e: Error) => { setError(e.message); setLoading(false); });
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

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,3vw,2rem)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '.65rem', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', margin: '0 0 .4rem' }}>AI4 Contact Center · Runtime</p>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem,3vw,2.5rem)', color: '#fff' }}>Agent Workspace</h1>
              <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '.86rem', margin: '.45rem 0 0' }}>Canonical interaction, routing, assist, transcript, QA and compliance view.</p>
            </div>
            <button onClick={runAcceptance} disabled={running} style={{ border: 0, borderRadius: 7, background: '#5bd3ff', color: '#06111f', padding: '.8rem 1.15rem', fontWeight: 900, cursor: running ? 'wait' : 'pointer', opacity: running ? .7 : 1 }}>
              {running ? 'Running interaction…' : 'Run Development Interaction'}
            </button>
          </div>

          {error && <div style={{ marginBottom: '1rem', padding: '.75rem 1rem', border: '1px solid rgba(255,100,100,.3)', borderRadius: 7, color: '#ff9090', background: 'rgba(255,80,80,.06)' }}>{error}</div>}

          {loading ? <p style={{ color: 'rgba(255,255,255,.45)' }}>Loading canonical runtime…</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px,320px) minmax(0,1fr)', gap: '1rem' }}>
              <aside style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,.025)' }}>
                <div style={{ padding: '.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: '.65rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', fontWeight: 800 }}>Recent Interactions</div>
                {interactions.length === 0 ? <div style={{ padding: '1.2rem', color: 'rgba(255,255,255,.4)', fontSize: '.85rem' }}>No interactions yet. Run the development interaction.</div> : interactions.map((item) => (
                  <button key={item.id} onClick={() => setSelectedId(item.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '.9rem 1rem', border: 0, borderBottom: '1px solid rgba(255,255,255,.06)', background: item.id === selected?.id ? 'rgba(91,211,255,.09)' : 'transparent', color: '#e8f0fe', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 800, fontSize: '.84rem', marginBottom: '.3rem' }}>{item.route?.intent ?? 'interaction'}</div>
                    <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap', fontSize: '.7rem', color: 'rgba(255,255,255,.45)' }}><span>{item.channel}</span><span>•</span><span>{item.status}</span><span>•</span><span>{new Date(item.started_at).toLocaleString()}</span></div>
                  </button>
                ))}
              </aside>

              <section>
                {!selected ? <div style={{ padding: '3rem', border: '1px dashed rgba(255,255,255,.1)', borderRadius: 10, color: 'rgba(255,255,255,.4)' }}>Select or create an interaction.</div> : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '.75rem' }}>
                      {[['Status', selected.status], ['Intent', selected.route?.intent ?? selected.assist?.detected_intent ?? '—'], ['Queue', selected.queue?.name ?? '—'], ['Agent', selected.agent?.name ?? '—'], ['Priority', selected.route?.priority ?? '—'], ['Escalation', selected.assist?.escalation_risk ?? '—']].map(([label, value]) => (
                        <div key={label} style={{ padding: '.9rem 1rem', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, background: 'rgba(255,255,255,.025)' }}><div style={{ fontSize: '.58rem', textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(255,255,255,.35)', marginBottom: '.35rem', fontWeight: 800 }}>{label}</div><div style={{ fontWeight: 800, color: '#fff' }}>{value}</div></div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(280px,.75fr)', gap: '1rem' }}>
                      <div style={{ padding: '1rem', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, background: 'rgba(255,255,255,.025)' }}>
                        <h2 style={{ margin: '0 0 .8rem', fontSize: '1rem', color: '#fff' }}>Transcript</h2>
                        {selected.transcript.map((turn) => <div key={`${turn.sequence_no}-${turn.speaker}`} style={{ marginBottom: '.75rem', padding: '.75rem .85rem', borderRadius: 8, background: turn.speaker === 'agent' ? 'rgba(91,211,255,.07)' : 'rgba(255,255,255,.04)' }}><div style={{ fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.12em', color: turn.speaker === 'agent' ? '#5bd3ff' : 'rgba(255,255,255,.4)', marginBottom: '.25rem', fontWeight: 800 }}>{turn.speaker ?? 'speaker'}</div><div style={{ lineHeight: 1.55, fontSize: '.9rem' }}>{turn.content}</div></div>)}
                      </div>

                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <div style={{ padding: '1rem', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, background: 'rgba(255,255,255,.025)' }}><h2 style={{ margin: '0 0 .65rem', fontSize: '1rem', color: '#fff' }}>AI Assist</h2>{(selected.assist?.suggested_replies ?? []).map((reply) => <div key={reply} style={{ marginBottom: '.55rem', fontSize: '.82rem', lineHeight: 1.45 }}>• {reply}</div>)}{(selected.assist?.next_best_actions ?? []).length > 0 && <><div style={{ marginTop: '.8rem', fontSize: '.6rem', textTransform: 'uppercase', letterSpacing: '.12em', color: '#5bd3ff', fontWeight: 800 }}>Next best actions</div>{selected.assist?.next_best_actions.map((action) => <div key={action} style={{ marginTop: '.35rem', fontSize: '.8rem' }}>→ {action}</div>)}</>}</div>
                        <div style={{ padding: '1rem', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, background: 'rgba(255,255,255,.025)' }}><h2 style={{ margin: '0 0 .65rem', fontSize: '1rem', color: '#fff' }}>QA</h2><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>{[['Quality', selected.qa?.quality_score], ['Compliance', selected.qa?.compliance_score], ['Adherence', selected.qa?.flow_adherence_score], ['Sentiment', selected.qa?.sentiment_score]].map(([label, value]) => <div key={String(label)}><div style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.35)', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>{value ?? '—'}</div></div>)}</div></div>
                      </div>
                    </div>

                    {(selected.assist?.compliance_alerts?.length ?? 0) + selected.compliance.length > 0 && <div style={{ padding: '1rem', border: '1px solid rgba(255,190,80,.22)', borderRadius: 10, background: 'rgba(255,180,60,.05)' }}><h2 style={{ margin: '0 0 .65rem', fontSize: '1rem', color: '#fff' }}>Compliance Findings</h2>{selected.assist?.compliance_alerts?.map((alert) => <div key={alert} style={{ marginBottom: '.4rem', fontSize: '.82rem' }}>⚠ {alert}</div>)}{selected.compliance.map((finding, index) => <div key={`${finding.rule_code}-${index}`} style={{ marginBottom: '.4rem', fontSize: '.82rem' }}>⚠ {finding.finding}</div>)}</div>}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
