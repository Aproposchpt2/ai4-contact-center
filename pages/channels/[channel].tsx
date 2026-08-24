import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type ChannelKey = 'voice' | 'sms' | 'chat';
type ChannelHealth = { status: string; details: { service?: string | null; queueReady?: boolean; agentReady?: boolean; flowVersionReady?: boolean; runtimeRouting?: boolean; signatureValidation?: boolean | null } };
type Interaction = { id: string; channel: string; customer_identifier: string | null; status: string; started_at: string; route?: { intent?: string | null } | null; queue?: { name: string } | null; agent?: { name: string } | null };

const META: Record<ChannelKey, { title: string; subtitle: string; runtime: string; primary: string; secondary?: string }> = {
  voice: { title: 'Voice Operations', subtitle: 'Incoming calling, IVR/auto-attendant readiness, queue routing and development interaction visibility.', runtime: 'Twilio Voice', primary: '/builder', secondary: '/voice-attendant' },
  sms: { title: 'SMS Operations', subtitle: 'Twilio messaging intake, routing, reply handling and canonical development interaction visibility.', runtime: 'Twilio Messaging', primary: '/agent-workspace?channel=sms' },
  chat: { title: 'Web Chat Operations', subtitle: 'Site chat runtime, queue/agent routing and canonical development conversation visibility.', runtime: 'AI4 Web Chat', primary: '/web-chat' },
};

function tone(status: string) {
  if (status === 'operational') return '#5ee6a8';
  if (status === 'degraded') return '#ffd166';
  if (status === 'unavailable') return '#ff7f8f';
  return '#91a8bc';
}

export default function ChannelOperationsPage() {
  const router = useRouter();
  const key = (typeof router.query.channel === 'string' ? router.query.channel : '') as ChannelKey;
  const meta = META[key];
  const [health, setHealth] = useState<ChannelHealth | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState('');

  async function load() {
    if (!router.isReady || !meta) return;
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Canonical Supabase configuration is required.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { await router.replace('/login'); return; }
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [channelRes, interactionRes] = await Promise.all([
        fetch('/api/mission-control/channels', { headers }),
        fetch('/api/runtime/interactions', { headers }),
      ]);
      if (channelRes.status === 401 || interactionRes.status === 401) { await router.replace('/login'); return; }
      const channelData = await channelRes.json();
      const interactionData = await interactionRes.json();
      if (!channelRes.ok) throw new Error(channelData?.error ?? 'Unable to load channel health');
      if (!interactionRes.ok) throw new Error(interactionData?.error ?? 'Unable to load interactions');
      setHealth(channelData[key]);
      setInteractions(((interactionData.interactions ?? []) as Interaction[]).filter((row) => row.channel === key).slice(0, 12));
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  const facts = useMemo(() => [
    ['Queue', health?.details.queueReady ? 'Ready' : 'Not checked'],
    ['Flow Version', health?.details.flowVersionReady ? 'Ready' : 'Not checked'],
    ['Runtime Routing', health?.details.runtimeRouting ? 'Ready' : 'Not checked'],
    ['Available Agent', health?.details.agentReady ? 'Available' : 'Not checked'],
  ], [health]);

  if (router.isReady && !meta) return <><Header /><main style={{minHeight:'70vh',padding:'4rem',background:'#06111f',color:'#fff'}}>Unknown channel. <Link href="/channels" style={{color:'#69d8ff'}}>Open Channel Operations</Link></main><Footer /></>;
  if (!meta) return null;

  return <>
    <Head><title>{meta.title} | AI4 Contact Center</title></Head>
    <Header />
    <main className="page"><div className="shell">
      <div className="crumbs"><Link href="/channels">Channel Operations</Link><span>/</span><b>{meta.title}</b></div>
      <section className="hero">
        <div><p className="eyebrow">AI4 CONTACT CENTER · DEVELOPMENT · {meta.runtime.toUpperCase()}</p><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>
        <div className="health"><small>CHANNEL STATUS</small><strong style={{color:tone(health?.status ?? 'unknown')}}>{health ? health.status.replace(/_/g,' ').toUpperCase() : 'NOT CHECKED'}</strong><span>{health?.details.service ?? meta.runtime}</span></div>
      </section>
      {error && <div className="error">{error}</div>}

      <section className="facts">{facts.map(([name,value]) => <div className="fact" key={name}><small>{name}</small><b>{value}</b></div>)}</section>

      <section className="actions">
        <button onClick={() => load().catch((e: Error) => setError(e.message))} disabled={loading}>{loading ? 'Checking…' : 'Check Status / Refresh'}</button>
        <Link className="primary" href={`/agent-workspace?channel=${key}`}>Open Filtered Agent Workspace</Link>
        {key === 'voice' && <Link href="/builder">Configure Script Writer</Link>}
        {key === 'voice' && <Link href="/voice-attendant">Open Voice Attendant</Link>}
        {key === 'chat' && <Link href="/web-chat">Launch Web Chat</Link>}
        <Link href="/flow-runtime-monitor">Runtime Monitor</Link>
      </section>

      <div className="sectionTitle"><div><small>RECENT {meta.title.toUpperCase()}</small><h2>Canonical interactions</h2></div><span>{lastChecked ? `Last checked ${lastChecked}` : 'On-demand only'}</span></div>
      <section className="list">
        {interactions.length === 0 ? <div className="empty">No snapshot loaded. Use Check Status / Refresh when you want current development data.</div> : interactions.map((item) => <Link key={item.id} href={`/agent-workspace?channel=${key}&interaction=${item.id}`} className="row">
          <div><b>{item.route?.intent ?? 'interaction'}</b><span>{item.customer_identifier ?? 'Unknown customer'}</span></div>
          <div><span>{item.queue?.name ?? 'No queue'}</span><span>{item.agent?.name ?? 'No agent'}</span></div>
          <div><strong>{item.status}</strong><time>{new Date(item.started_at).toLocaleString()}</time></div>
        </Link>)}
      </section>
    </div></main>
    <Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}:global(body){margin:0;background:#06111f}.page{min-height:100vh;background:radial-gradient(circle at 85% 5%,rgba(53,178,235,.12),transparent 30%),linear-gradient(155deg,#06111f,#071827 55%,#06111f);color:#eef8ff;padding:46px 24px 80px}.shell{max-width:1180px;margin:auto}.crumbs{display:flex;gap:8px;font-size:.72rem;color:#6f8799}.crumbs :global(a){color:#69d8ff;text-decoration:none}.hero{display:grid;grid-template-columns:2fr 1fr;gap:22px;align-items:end;margin-top:22px}.eyebrow,small{font-size:.63rem;font-weight:900;letter-spacing:.15em;color:#718ba0}h1{font-size:clamp(2.5rem,5vw,4.8rem);margin:8px 0 10px;letter-spacing:-.04em}.hero p{max-width:720px;color:#91a8bb;line-height:1.6}.health{border:1px solid #19384d;border-radius:13px;background:rgba(7,24,38,.74);padding:19px;display:grid;gap:10px}.health strong{font-size:1rem}.health span{font-size:.74rem;color:#7891a3}.error{margin:18px 0;padding:12px;border:1px solid #74404a;border-radius:8px;color:#ffc0c8}.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:28px}.fact{border:1px solid #19384d;border-radius:10px;background:rgba(7,24,38,.7);padding:15px}.fact small{display:block}.fact b{display:block;margin-top:7px;color:#d7e9f4}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.actions :global(a),.actions button{text-decoration:none;color:#c8edf9;border:1px solid #234b64;border-radius:8px;padding:10px 13px;font-size:.74rem;font-weight:800;background:transparent;cursor:pointer}.actions button{background:#69d8ff;color:#06111f;border-color:#69d8ff}.actions button:disabled{opacity:.6;cursor:default}.actions :global(.primary){background:#17364b;color:#d8edf7}.sectionTitle{display:flex;justify-content:space-between;align-items:end;margin-top:44px;margin-bottom:12px}.sectionTitle h2{margin:5px 0 0}.sectionTitle span{font-size:.7rem;color:#678094}.list{border:1px solid #19384d;border-radius:12px;overflow:hidden}.row{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:16px;padding:14px 16px;border-bottom:1px solid #123047;text-decoration:none;color:#d8eaf4}.row:hover{background:rgba(105,216,255,.04)}.row div{display:grid;gap:4px}.row span,.row time{font-size:.7rem;color:#71899b}.row strong{font-size:.72rem;text-transform:uppercase;color:#69d8ff}.empty{padding:22px;color:#7891a3}@media(max-width:820px){.hero{grid-template-columns:1fr}.facts{grid-template-columns:repeat(2,1fr)}.row{grid-template-columns:1fr}}@media(max-width:520px){.page{padding:34px 14px 60px}.facts{grid-template-columns:1fr}}`}</style>
  </>;
}