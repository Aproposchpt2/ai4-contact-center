import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Channel = { status: string; details: { service?: string | null; queueReady?: boolean; agentReady?: boolean; flowVersionReady?: boolean; runtimeRouting?: boolean } };
type Payload = { voice: Channel; sms: Channel; chat: Channel };

const CHANNELS = [
  { key: 'voice', name: 'Voice', description: 'Incoming calling, IVR/auto-attendant readiness, queues and development interaction operations.' },
  { key: 'sms', name: 'SMS', description: 'Twilio messaging intake, routing, reply handling and canonical development interaction operations.' },
  { key: 'chat', name: 'Web Chat', description: 'Site chat sessions, runtime routing, queue/agent assignment and development conversation operations.' },
] as const;

function tone(status: string) {
  if (status === 'operational') return '#5ee6a8';
  if (status === 'degraded') return '#ffd166';
  if (status === 'unavailable') return '#ff7f8f';
  return '#91a8bc';
}

export default function ChannelsPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Canonical Supabase configuration is required.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { await router.replace('/login'); return; }
      const res = await fetch('/api/mission-control/channels', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.status === 401) { await router.replace('/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Unable to load channel health');
      setPayload(data);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  return <>
    <Head><title>Channel Operations | AI4 Contact Center</title></Head>
    <Header />
    <main className="page"><div className="shell">
      <p className="eyebrow">AI4 CONTACT CENTER · DEVELOPMENT OPERATIONS</p>
      <h1>Channel Operations</h1>
      <p className="lede">Development control surface for the Voice, SMS and Web Chat runtimes. Automatic monitoring is disabled. Check status only when you need a current snapshot.</p>
      <div className="toolbar"><button onClick={() => load().catch((e: Error) => setError(e.message))} disabled={loading}>{loading ? 'Checking…' : 'Check Channel Status'}</button><span>{lastChecked ? `Last checked ${lastChecked}` : 'On-demand only'}</span></div>
      {error && <div className="error">{error}</div>}
      <div className="grid">
        {CHANNELS.map((item) => {
          const channel = payload?.[item.key];
          return <Link key={item.key} href={`/channels/${item.key}`} className="card">
            <div className="top"><h2>{item.name}</h2><span style={{ color: tone(channel?.status ?? 'unknown') }}>{channel ? channel.status.replace(/_/g, ' ').toUpperCase() : 'NOT CHECKED'}</span></div>
            <p>{item.description}</p>
            <div className="facts"><span>Queue <b>{channel ? (channel.details.queueReady ? 'Ready' : 'Not ready') : 'Not checked'}</b></span><span>Flow <b>{channel ? (channel.details.flowVersionReady ? 'Ready' : 'Not ready') : 'Not checked'}</b></span><span>Routing <b>{channel ? (channel.details.runtimeRouting ? 'Ready' : 'Not ready') : 'Not checked'}</b></span><span>Agent <b>{channel ? (channel.details.agentReady ? 'Available' : 'None available') : 'Not checked'}</b></span></div>
            <strong className="open">Open {item.name} Operations →</strong>
          </Link>;
        })}
      </div>
      <div className="actions"><Link href="/agent-workspace">Open Unified Agent Workspace</Link><Link href="/">Mission Control</Link></div>
    </div></main>
    <Footer />
    <style jsx>{`
      :global(*){box-sizing:border-box}:global(body){margin:0;background:#06111f}.page{min-height:100vh;background:linear-gradient(155deg,#06111f,#071827 55%,#06111f);color:#eef8ff;padding:52px 24px 80px}.shell{max-width:1180px;margin:auto}.eyebrow{color:#69d8ff;font-size:.66rem;font-weight:900;letter-spacing:.18em}h1{font-size:clamp(2.4rem,5vw,4.7rem);margin:10px 0 12px;letter-spacing:-.04em}.lede{max-width:780px;color:#94aabd;line-height:1.65}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:20px}.toolbar button{border:0;border-radius:8px;background:#69d8ff;color:#06111f;padding:10px 14px;font-weight:900;cursor:pointer}.toolbar button:disabled{opacity:.6}.toolbar span{font-size:.72rem;color:#71899b}.error{margin:20px 0;padding:12px;border:1px solid #74404a;border-radius:8px;color:#ffc0c8}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:32px}.card{display:block;text-decoration:none;color:inherit;border:1px solid #19384d;border-radius:14px;background:rgba(7,24,38,.76);padding:20px;transition:.18s ease}.card:hover{transform:translateY(-2px);border-color:#2d6687}.top{display:flex;justify-content:space-between;gap:12px;align-items:center}.top h2{margin:0;font-size:1.35rem}.top span{font-size:.63rem;font-weight:900;letter-spacing:.1em}.card p{color:#8299aa;line-height:1.55;min-height:72px}.facts{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.72rem;color:#71899b}.facts span{border:1px solid #143047;border-radius:7px;padding:8px}.facts b{display:block;color:#d7e9f4;margin-top:3px}.open{display:block;margin-top:18px;color:#70dbff;font-size:.78rem}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.actions :global(a){text-decoration:none;color:#bfeeff;border:1px solid #234b64;border-radius:8px;padding:10px 14px;font-weight:800;font-size:.76rem}@media(max-width:850px){.grid{grid-template-columns:1fr}}`}</style>
  </>;
}