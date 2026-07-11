import type { CSSProperties } from 'react';
import type { AssistGuidance } from '@/lib/agentAssistEngine';

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  guidance: AssistGuidance | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
  onDownload: () => void;
};

export default function AgentAssistDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Live Transcript Feed</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={9} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button style={primaryBtn} onClick={props.onRun} disabled={props.busy}>Run Agent Assist</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.guidance}>Download assist-session.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Guidance</h3>
        {!props.guidance ? <p style={muted}>Run guidance to see suggestions, KB grounding, and compliance alerts.</p> : (
          <>
            <p><strong>Intent:</strong> {props.guidance.detectedIntent} · <strong>Flow Node:</strong> {props.guidance.mappedFlowNode}</p>
            <StringList title="Suggested Replies" items={props.guidance.suggestedReplies} />
            <StringList title="Compliance Alerts" items={props.guidance.complianceAlerts} />
            <StringList title="Next Best Actions" items={props.guidance.nextBestActions} />
            <StringList title="KB Grounding" items={props.guidance.kbGrounding.map((k) => `${k.title}: ${k.snippet}`)} />
          </>
        )}
      </section>
    </div>
  );
}

function StringList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginTop: '.5rem' }}>
      <p style={{ margin: '0 0 .2rem 0', fontWeight: 700 }}>{title}</p>
      {items.length === 0 ? <p style={muted}>No items.</p> : <ul style={{ margin: '.2rem 0 0 .9rem' }}>{items.map((i, idx) => <li key={`${title}-${idx}`}>{i}</li>)}</ul>}
    </div>
  );
}

const panel: CSSProperties = { border: '1px solid rgba(255,255,255,.12)', borderRadius: '10px', padding: '.9rem', background: 'rgba(255,255,255,.03)' };
const title: CSSProperties = { margin: '0 0 .5rem 0', fontSize: '1rem' };
const muted: CSSProperties = { opacity: 0.72, margin: '.2rem 0' };
const textarea: CSSProperties = { width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,.2)', background: '#07192b', color: '#eaf2ff', padding: '.7rem', fontFamily: 'monospace' };
const primaryBtn: CSSProperties = { background: '#5bd3ff', color: '#06111f', border: 0, borderRadius: '6px', padding: '.5rem .8rem', fontWeight: 700, cursor: 'pointer' };
const secondaryBtn: CSSProperties = { background: '#12324f', color: '#eaf2ff', border: '1px solid rgba(255,255,255,.2)', borderRadius: '6px', padding: '.5rem .8rem', fontWeight: 700, cursor: 'pointer' };

