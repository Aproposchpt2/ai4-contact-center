'use client';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type MetricSet = {
  totalCalls: number;
  completedCalls: number;
  activeCalls: number;
  abandonedCalls: number;
  failedCalls: number;
  afterHoursCalls: number;
  holidayCalls: number;
  voicemailCalls: number;
  speechCalls: number;
  dtmfCalls: number;
  routedCalls: number;
  agentAssignedCalls: number;
  averageHandleSeconds: number | null;
  averageEstimatedWaitSeconds: number | null;
  overflowCount: number;
  voicemailOpenCallbacks: number;
  averageQualityScore: number | null;
  averageComplianceScore: number | null;
  averageFlowAdherenceScore: number | null;
  openComplianceFindings: number;
  highSeverityComplianceFindings: number;
};

type Analytics = {
  generatedAt: string;
  window: string;
  environment: string;
  metrics: MetricSet;
  intents: Array<{name:string;count:number}>;
  queues: Array<{name:string;count:number}>;
  agents: Array<{name:string;count:number}>;
  dailyVolume: Array<{date:string;count:number}>;
  recentCalls: Array<{id:string;status:string;startedAt:string;endedAt:string|null;capture:string|null;temporalState:string;intent:string|null;queue:string|null;agent:string|null}>;
};

function seconds(value: number | null) {
  if (value == null) return '—';
  if (value < 60) return `${value}s`;
  return `${(value / 60).toFixed(1)}m`;
}

function pct(part: number, total: number) {
  return total ? `${Math.round(part / total * 100)}%` : '—';
}

export default function VoiceOperationsPage() {
  const router = useRouter();
  const [windowKey, setWindowKey] = useState('7d');
  const [environment, setEnvironment] = useState('production');
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Canonical Supabase configuration is required.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { await router.replace('/login'); return; }
      const res = await fetch(`/api/runtime/voice-analytics?window=${encodeURIComponent(windowKey)}&environment=${encodeURIComponent(environment)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 401) { await router.replace('/login'); return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'Unable to load Voice analytics');
      setData(body as Analytics);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const m = data?.metrics;
  const maxIntent = Math.max(1, ...(data?.intents.map(x => x.count) ?? [1]));
  const maxQueue = Math.max(1, ...(data?.queues.map(x => x.count) ?? [1]));
  const maxDaily = Math.max(1, ...(data?.dailyVolume.map(x => x.count) ?? [1]));

  return <>
    <Head><title>Voice Operations & Analytics | AI4 Contact Center</title></Head>
    <Header />
    <main className="page"><div className="shell">
      <div className="crumbs"><Link href="/channels/voice">Voice Channel</Link><span>/</span><b>Operations & Analytics</b></div>
      <section className="hero">
        <div><p className="eyebrow">APROPOS GROUP LLC · AI4 CONTACT CENTER</p><h1>Voice Operations & Analytics</h1><p>Canonical production visibility for live Twilio Voice interactions, routing, queues, agents, voicemail, QA and compliance. Data is queried on demand; no heartbeat or background polling is used.</p></div>
        <div className="authority"><small>ANALYTICS AUTHORITY</small><b>Canonical AI4CC Runtime</b><span>{data ? `Snapshot · ${new Date(data.generatedAt).toLocaleString()}` : 'No snapshot loaded'}</span></div>
      </section>

      <section className="controls">
        <label>Window<select value={windowKey} onChange={e => setWindowKey(e.target.value)}><option value="24h">Last 24 Hours</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option></select></label>
        <label>Runtime<select value={environment} onChange={e => setEnvironment(e.target.value)}><option value="production">Production Only</option><option value="all">All Twilio Runtime</option></select></label>
        <button onClick={() => refresh()} disabled={loading}>{loading ? 'Loading Snapshot…' : 'Refresh Voice Analytics'}</button>
        <Link href="/agent-workspace?channel=voice">Agent Workspace</Link>
        <Link href="/voicemails">Voicemails</Link>
      </section>

      {error && <div className="error">{error}</div>}
      {!data && !loading && <div className="empty">Select a window and refresh to load a canonical Voice operations snapshot.</div>}

      {data && m && <>
        <section className="metrics">
          <Metric label="Total Calls" value={String(m.totalCalls)} />
          <Metric label="Completed" value={String(m.completedCalls)} support={pct(m.completedCalls,m.totalCalls)} />
          <Metric label="Active / Open" value={String(m.activeCalls)} />
          <Metric label="Abandoned" value={String(m.abandonedCalls)} />
          <Metric label="Avg Handle Time" value={seconds(m.averageHandleSeconds)} />
          <Metric label="Avg Est. Wait" value={seconds(m.averageEstimatedWaitSeconds)} />
          <Metric label="Routed Calls" value={String(m.routedCalls)} support={pct(m.routedCalls,m.totalCalls)} />
          <Metric label="Agent Assigned" value={String(m.agentAssignedCalls)} support={pct(m.agentAssignedCalls,m.totalCalls)} />
        </section>

        <div className="sectionTitle"><div><p className="eyebrow">CALL HANDLING</p><h2>Runtime distribution</h2></div></div>
        <section className="metrics compact">
          <Metric label="Speech" value={String(m.speechCalls)} />
          <Metric label="DTMF" value={String(m.dtmfCalls)} />
          <Metric label="After Hours" value={String(m.afterHoursCalls)} />
          <Metric label="Holiday" value={String(m.holidayCalls)} />
          <Metric label="Voicemail" value={String(m.voicemailCalls)} />
          <Metric label="Open Callbacks" value={String(m.voicemailOpenCallbacks)} />
          <Metric label="Overflow" value={String(m.overflowCount)} />
          <Metric label="Failed" value={String(m.failedCalls)} />
        </section>

        <div className="split">
          <section className="panel"><p className="eyebrow">INTENT MIX</p><h2>Why callers are reaching us</h2><Bars rows={data.intents} max={maxIntent} /></section>
          <section className="panel"><p className="eyebrow">QUEUE LOAD</p><h2>Where calls are routed</h2><Bars rows={data.queues} max={maxQueue} /></section>
        </div>

        <div className="split">
          <section className="panel"><p className="eyebrow">QUALITY</p><h2>Operational quality signals</h2><div className="quality"><Quality label="Quality" value={m.averageQualityScore}/><Quality label="Compliance" value={m.averageComplianceScore}/><Quality label="Flow Adherence" value={m.averageFlowAdherenceScore}/></div></section>
          <section className="panel"><p className="eyebrow">COMPLIANCE</p><h2>Finding status</h2><div className="quality"><Quality label="Open Findings" value={m.openComplianceFindings}/><Quality label="High Severity" value={m.highSeverityComplianceFindings}/><Quality label="QA Samples" value={m.averageQualityScore == null ? null : data.recentCalls.length}/></div></section>
        </div>

        <section className="panel"><p className="eyebrow">DAILY VOLUME</p><h2>Call activity</h2><div className="daily">{data.dailyVolume.length ? data.dailyVolume.map(row => <div key={row.date} className="day"><span>{row.date.slice(5)}</span><div><i style={{height:`${Math.max(8,row.count/maxDaily*100)}%`}} /></div><b>{row.count}</b></div>) : <p className="muted">No calls in this window.</p>}</div></section>

        <section className="panel"><p className="eyebrow">AGENT WORKLOAD</p><h2>Assigned Voice interactions</h2><Bars rows={data.agents} max={Math.max(1,...data.agents.map(x=>x.count))} /></section>

        <section className="panel"><p className="eyebrow">RECENT CALLS</p><h2>Canonical Voice interactions</h2><div className="table">{data.recentCalls.length ? data.recentCalls.map(call => <Link key={call.id} href={`/agent-workspace?channel=voice&interaction=${call.id}`} className="call"><div><b>{call.intent ?? 'interaction'}</b><span>{call.capture ?? '—'} · {call.temporalState.replace(/_/g,' ')}</span></div><div><span>{call.queue ?? 'No queue'}</span><span>{call.agent ?? 'No agent'}</span></div><div><strong>{call.status}</strong><time>{new Date(call.startedAt).toLocaleString()}</time></div></Link>) : <p className="muted">No Voice calls in this snapshot.</p>}</div></section>
      </>}
    </div></main>
    <Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}:global(body){margin:0;background:#071a3c;color:#eef3ff;font-family:Arial,sans-serif}.page{min-height:100vh;background:#071a3c;color:#eef3ff;padding:42px 22px 72px}.shell{max-width:1240px;margin:auto}.crumbs{display:flex;gap:8px;color:rgba(255,255,255,.48);font-size:.72rem}.crumbs :global(a){color:#e8cb87;text-decoration:none}.hero{display:grid;grid-template-columns:2fr 1fr;gap:22px;align-items:end;margin-top:20px}.eyebrow{margin:0 0 7px;color:#d5ae55;font:700 11px/1.4 Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase}h1,h2{font-family:Georgia,'Times New Roman',serif;font-weight:400}h1{font-size:clamp(2.1rem,5vw,3.8rem);margin:5px 0 10px;line-height:1.08}.hero>div>p:last-child{color:rgba(255,255,255,.58);max-width:760px;line-height:1.65}.authority,.panel,.empty{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.13);border-radius:12px}.authority{padding:18px;display:grid;gap:8px}.authority small{color:#d5ae55;font-size:.62rem;font-weight:800;letter-spacing:.14em}.authority b{font-family:Georgia,serif;font-weight:400;font-size:1.2rem}.authority span{color:rgba(255,255,255,.5);font-size:.72rem}.controls{display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin:24px 0}.controls label{display:grid;gap:5px;color:rgba(255,255,255,.58);font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.controls select{background:rgba(255,255,255,.05);color:#eef3ff;border:1px solid rgba(255,255,255,.13);border-radius:6px;padding:10px;min-width:150px}.controls button,.controls :global(a){min-height:40px;padding:10px 14px;border-radius:6px;font:700 14px Arial,sans-serif;text-decoration:none;display:inline-flex;align-items:center}.controls button{background:#0f2a6a;color:#d5ae55;border:1px solid rgba(213,174,85,.72);cursor:pointer}.controls button:disabled{opacity:.6}.controls :global(a){background:transparent;color:#eef3ff;border:1px solid rgba(255,255,255,.13)}.error{border:1px solid rgba(255,119,119,.5);color:#ff7777;padding:12px;border-radius:8px}.empty{padding:26px;color:rgba(255,255,255,.58)}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metrics.compact{margin-bottom:34px}.sectionTitle{margin-top:38px}.sectionTitle h2{margin:0;font-size:1.5rem}.split{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.panel{padding:18px;margin-top:12px}.panel h2{margin:0 0 18px;font-size:1.35rem}.quality{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.daily{display:flex;align-items:end;gap:10px;min-height:170px;overflow-x:auto}.day{min-width:58px;display:grid;gap:5px;text-align:center;font-size:.68rem}.day>div{height:120px;border:1px solid rgba(255,255,255,.1);display:flex;align-items:end;padding:3px;border-radius:5px}.day i{display:block;width:100%;background:#d5ae55;border-radius:3px}.day span,.muted{color:rgba(255,255,255,.5)}.table{border:1px solid rgba(255,255,255,.1);border-radius:8px;overflow:hidden}.call{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:14px;padding:13px;border-bottom:1px solid rgba(255,255,255,.1);text-decoration:none;color:#eef3ff}.call:hover{background:rgba(255,255,255,.04)}.call div{display:grid;gap:3px}.call span,.call time{color:rgba(255,255,255,.5);font-size:.7rem}.call strong{color:#e8cb87;font-size:.7rem;text-transform:uppercase}@media(max-width:900px){.hero,.split{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.page{padding:30px 14px 55px}.metrics,.quality{grid-template-columns:1fr}.controls>*{width:100%}.controls select{width:100%}.call{grid-template-columns:1fr}}
    `}</style>
  </>;
}

function Metric({label,value,support}:{label:string;value:string;support?:string}){
  return <div className="metric"><small>{label}</small><b>{value}</b>{support && <span>{support}</span>}<style jsx>{`.metric{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.13);border-radius:12px;padding:16px}.metric small{display:block;color:rgba(255,255,255,.5);font:700 10px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}.metric b{display:block;margin-top:8px;color:#e8cb87;font:400 1.55rem Georgia,serif}.metric span{display:block;margin-top:3px;color:rgba(255,255,255,.42);font-size:.68rem}`}</style></div>
}

function Bars({rows,max}:{rows:Array<{name:string;count:number}>;max:number}){
  if (!rows.length) return <p style={{color:'rgba(255,255,255,.5)'}}>No data in this window.</p>;
  return <div>{rows.map(row => <div className="bar" key={row.name}><div><span>{row.name.replace(/_/g,' ')}</span><b>{row.count}</b></div><i><em style={{width:`${Math.max(4,row.count/max*100)}%`}} /></i><style jsx>{`.bar{margin:11px 0}.bar div{display:flex;justify-content:space-between;gap:10px;color:#eef3ff;font-size:.76rem}.bar span{text-transform:capitalize}.bar b{color:#e8cb87}.bar i{display:block;height:7px;margin-top:5px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden}.bar em{display:block;height:100%;background:#d5ae55;border-radius:99px}`}</style></div>)}</div>
}

function Quality({label,value}:{label:string;value:number|null}){
  return <div className="q"><small>{label}</small><b>{value == null ? '—' : value}</b><style jsx>{`.q{border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:13px}.q small{display:block;color:rgba(255,255,255,.5);font:700 10px Arial,sans-serif;text-transform:uppercase;letter-spacing:.1em}.q b{display:block;margin-top:7px;font:400 1.45rem Georgia,serif;color:#e8cb87}`}</style></div>
}
