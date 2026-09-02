import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type StatusPayload = {
  tenant: { name: string; role: string };
  platform: { status: string; windowHours: number };
  flows: { total: number; versions: number; latestVersion: null | { flowName: string; version: number; validationStatus: string | null } };
  deployments: Record<string, null | { status: string }>;
  runtime: { activeInteractions: number; completedInteractionsWindow: number; openComplianceFindings: number; recentAuditActivity: Array<{ id: string; action: string; created_at: string }> };
  quality: { averageQualityScore: number | null };
  metrics: { ahtSeconds: number | null; containmentPercent: number | null; qaCoveragePercent: number | null; timeToDeploySeconds: number | null };
  modules: Array<{ id: string; name: string; route: string; group: string; maturity: string }>;
};

type Channel = { status: string; details: { queueReady?: boolean; agentReady?: boolean; flowVersionReady?: boolean; runtimeRouting?: boolean } };
type ChannelsPayload = { voice: Channel; sms: Channel; chat: Channel };

const groups = ['Flow Authoring', 'Release & Runtime', 'Intelligence', 'Workforce & Experience', 'Governance & Assurance', 'Platform Services'];

function label(value: string) { return value.replace(/_/g, ' ').toUpperCase(); }
function tone(value: string) {
  if (value === 'operational') return '#5ee6a8';
  if (value === 'degraded') return '#ffd166';
  if (value === 'attention_required') return '#ff9f68';
  if (value === 'unavailable') return '#ff7f8f';
  return '#91a8bc';
}
function metric(value: number | null | undefined, suffix = '') { return value == null ? 'Not checked' : `${value.toLocaleString()}${suffix}`; }
function duration(value: number | null | undefined) { return value == null ? 'Not checked' : value < 60 ? `${Math.round(value)} sec` : `${(value / 60).toFixed(1)} min`; }

export default function MissionControlPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [channels, setChannels] = useState<ChannelsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Canonical Supabase storage is not configured.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { await router.replace('/login'); return; }
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [s, c] = await Promise.all([fetch('/api/mission-control/status', { headers }), fetch('/api/mission-control/channels', { headers })]);
      if (s.status === 401 || c.status === 401) { await router.replace('/login'); return; }
      const sb = await s.json(); const cb = await c.json();
      if (!s.ok) throw new Error(sb?.error ?? 'Mission Control status failed');
      if (!c.ok) throw new Error(cb?.error ?? 'Channel health failed');
      setStatus(sb); setChannels(cb); setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  const launchGroups = useMemo(() => groups.map(group => [group, status?.modules.filter(m => m.group === group) ?? []] as const), [status]);
  const channelList: Array<[string, Channel | undefined, string]> = [
    ['Voice', channels?.voice, '/channels/voice'],
    ['SMS', channels?.sms, '/channels/sms'],
    ['Web Chat', channels?.chat, '/channels/chat'],
  ];

  return <>
    <Head><title>Mission Control | AI4 Contact Center</title><meta name="description" content="AI4 Contact Center Mission Control" /><meta name="robots" content="noindex" /></Head>
    <Header />
    <main className="page"><div className="shell">
      <div className="topbar"><div className="badge">● DEVELOPMENT MISSION CONTROL</div><div className="manual"><button onClick={() => load().catch((e: Error) => setError(e.message))} disabled={loading}>{loading ? 'Checking…' : 'Check System Status'}</button><span>{lastChecked ? `Last checked ${lastChecked}` : 'Monitoring off · on-demand only'}</span></div></div>
      <section className="hero">
        <div><div className="brand">AI4 CONTACT CENTER</div><h1>Development operations.<br/><span>Canonical control.</span></h1><p>The contact-center platform is in development. Continuous monitoring is disabled; current status is queried only when you request it.</p></div>
        <div className="card"><small>PLATFORM STATUS</small><strong style={{color:tone(status?.platform.status ?? 'unknown')}}>{status ? label(status.platform.status) : 'NOT CHECKED'}</strong><b>{status?.tenant.name ?? 'No snapshot loaded'}</b><em>{status?.tenant.role ? `ROLE · ${status.tenant.role.toUpperCase()}` : 'ON-DEMAND DEVELOPMENT MODE'}</em></div>
      </section>
      {error && <div className="error">{error}</div>}

      <section className="grid four">
        <Stat name="AHT" value={duration(status?.metrics.ahtSeconds)} />
        <Stat name="Containment" value={metric(status?.metrics.containmentPercent, '%')} />
        <Stat name="QA Coverage" value={metric(status?.metrics.qaCoveragePercent, '%')} />
        <Stat name="Time-to-Deploy" value={duration(status?.metrics.timeToDeploySeconds)} />
      </section>

      <Title eyebrow="DEVELOPMENT OPERATIONS" title="Runtime command picture" links={[['Agent Workspace','/agent-workspace'],['Channel Operations','/channels'],['Runtime Monitor','/flow-runtime-monitor']]} />
      <section className="grid four"><Stat name="Active Interactions" value={status ? String(status.runtime.activeInteractions) : 'Not checked'} /><Stat name="Completed · 24h" value={status ? String(status.runtime.completedInteractionsWindow) : 'Not checked'} /><Stat name="Open Compliance" value={status ? String(status.runtime.openComplianceFindings) : 'Not checked'} /><Stat name="Average Quality" value={status?.quality.averageQualityScore == null ? 'Not checked' : `${status.quality.averageQualityScore}/100`} /></section>

      <Title eyebrow="CHANNEL HEALTH" title="Omni-channel runtime" links={[['Open Channel Operations','/channels']]} />
      <section className="grid three">{channelList.map(([name, channel, href]) => <Link className="channel" href={href} key={name}><div><b>{name}</b><strong style={{color:tone(channel?.status ?? 'unknown')}}>{channel ? label(channel.status) : 'NOT CHECKED'}</strong></div><p>Queue: {channel ? (channel.details.queueReady ? 'Ready' : 'Not ready') : 'Not checked'} · Flow: {channel ? (channel.details.flowVersionReady ? 'Ready' : 'Not ready') : 'Not checked'}</p><p>Routing: {channel ? (channel.details.runtimeRouting ? 'Ready' : 'Not ready') : 'Not checked'} · Agent: {channel ? (channel.details.agentReady ? 'Available' : 'None available') : 'Not checked'}</p><span className="openChannel">Open {name} Operations →</span></Link>)}</section>

      <Title eyebrow="FLOW + RELEASE" title="Canonical release control" links={[['Flow Library','/dashboard'],['Deployment','/flow-deployment']]} />
      <section className="grid two"><div className="card"><small>FLOW AUTHORITY</small><div className="numbers"><b>{status?.flows.total ?? '—'}<em>Flows</em></b><b>{status?.flows.versions ?? '—'}<em>Versions</em></b></div><p>{status?.flows.latestVersion ? `Latest: ${status.flows.latestVersion.flowName} · v${status.flows.latestVersion.version} · ${status.flows.latestVersion.validationStatus ?? 'validation unknown'}` : 'Check system status when you need the current canonical flow snapshot.'}</p></div><div className="card"><small>ENVIRONMENT STATE</small>{['dev','qa','staging','production'].map(env => <div className="env" key={env}><span>{env.toUpperCase()}</span><b>{status ? (status.deployments?.[env]?.status ?? 'No deployment') : 'Not checked'}</b></div>)}</div></section>

      <Title eyebrow="SYSTEM LAUNCHPAD" title="Recovered distributed controller" />
      <section className="launch">{launchGroups.map(([group, modules]) => <div className="card" key={group}><small>{group}</small><div className="links">{modules.length === 0 ? <span className="inactive">Check system status to load modules.</span> : modules.map(module => <Link href={module.route} key={module.id}><span>{module.name}</span><em>{module.maturity.replace(/_/g,' ')}</em></Link>)}</div></div>)}</section>

      <section className="card audit"><small>RECENT CANONICAL ACTIVITY</small>{(status?.runtime.recentAuditActivity ?? []).length === 0 ? <p>No snapshot loaded.</p> : (status?.runtime.recentAuditActivity ?? []).map(item => <div key={item.id}><span>{item.action}</span><time>{new Date(item.created_at).toLocaleString()}</time></div>)}</section>
    </div></main><Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}:global(body){margin:0;background:#06111f}.page{min-height:100vh;color:#eef8ff;background:radial-gradient(circle at 80% 5%,rgba(53,178,235,.12),transparent 30%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);padding:52px 24px 80px}.shell{max-width:1240px;margin:auto}.topbar{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}.badge{display:inline-block;border:1px solid #244862;border-radius:999px;padding:7px 13px;color:#8ddfff;font-size:.68rem;font-weight:900;letter-spacing:.16em}.manual{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.manual button{border:0;border-radius:8px;background:#69d8ff;color:#06111f;padding:9px 13px;font-weight:900;cursor:pointer}.manual button:disabled{opacity:.6}.manual span{font-size:.7rem;color:#71899b}.hero{display:grid;grid-template-columns:2fr 1fr;gap:28px;align-items:end;margin-top:24px}.brand,small{color:#718ba0;font-size:.64rem;font-weight:900;letter-spacing:.16em}h1{font-size:clamp(2.7rem,6vw,5.5rem);line-height:.98;letter-spacing:-.05em;margin:14px 0}h1 span{color:#69d8ff}.hero p{color:#9eb3c4;line-height:1.65;max-width:760px}.card,.channel{border:1px solid #19384d;border-radius:13px;background:rgba(7,24,38,.72);padding:19px}.hero .card{display:grid;gap:12px}.hero .card strong{font-size:.9rem}.hero .card em{font-size:.62rem;color:#6f8799;font-style:normal}.error{margin-top:20px;border:1px solid #74404a;background:#2b151d;padding:13px;border-radius:9px;color:#ffc0c8}.grid{display:grid;gap:12px}.four{grid-template-columns:repeat(4,1fr);margin-top:28px}.three{grid-template-columns:repeat(3,1fr)}.two{grid-template-columns:repeat(2,1fr)}.channel{text-decoration:none;color:inherit}.channel div{display:flex;justify-content:space-between;gap:10px}.channel p,.card p{color:#7891a3;font-size:.74rem}.openChannel{display:block;margin-top:13px;color:#69d8ff;font-size:.7rem;font-weight:900}.numbers{display:flex;gap:40px;margin-top:18px}.numbers b{font-size:2rem;color:#69d8ff}.numbers em{display:block;font-size:.7rem;color:#7891a3;font-style:normal}.env{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #123047;font-size:.72rem}.launch{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.links{display:grid;gap:5px;margin-top:12px}.links :global(a){display:flex;justify-content:space-between;gap:10px;text-decoration:none;color:#c7dbe8;background:rgba(255,255,255,.02);padding:8px}.links em{font-size:.55rem;color:#668094;font-style:normal;text-transform:uppercase}.inactive{font-size:.72rem;color:#668094}.audit{margin-top:36px}.audit div{display:flex;justify-content:space-between;border-bottom:1px solid #123047;padding:9px 0;font-size:.74rem;color:#adc1d0}.audit time{color:#667f91}@media(max-width:900px){.hero{grid-template-columns:1fr}.four{grid-template-columns:repeat(2,1fr)}.launch{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.page{padding:36px 15px 60px}.four,.three,.two,.launch{grid-template-columns:1fr}.audit div{display:grid;gap:4px}}
    `}</style>
  </>;
}

function Stat({name,value}:{name:string;value:string}){return <div className="stat"><small>{name}</small><b>{value}</b><style jsx>{`.stat{border:1px solid #19384d;border-radius:12px;background:rgba(7,24,38,.7);padding:18px}.stat small{display:block;color:#718ba0;font-size:.61rem;font-weight:900;letter-spacing:.14em}.stat b{display:block;margin-top:10px;font-size:1.45rem;color:#69d8ff}`}</style></div>}
function Title({eyebrow,title,links=[]}:{eyebrow:string;title:string;links?:Array<[string,string]>}){return <div className="title"><div><small>{eyebrow}</small><h2>{title}</h2></div><div>{links.map(([name,href])=><Link href={href} key={href}>{name} →</Link>)}</div><style jsx>{`.title{display:flex;justify-content:space-between;align-items:end;gap:20px;margin:46px 0 15px}.title small{color:#718ba0;font-size:.63rem;font-weight:900;letter-spacing:.16em}.title h2{margin:5px 0 0;font-size:1.45rem}.title div:last-child{display:flex;gap:14px;flex-wrap:wrap}.title :global(a){color:#76d9ff;text-decoration:none;font-size:.75rem;font-weight:800}@media(max-width:650px){.title{align-items:flex-start;flex-direction:column}}`}</style></div>}
