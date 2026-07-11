import type { CSSProperties } from 'react';

type ExportConfig = {
  systems: Array<{ id: string; name: string; type: string; endpoint: string; enabled: boolean }>;
  workflows: Array<{ id: string; name: string; steps: string[] }>;
  exportedAt: string;
};

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  config: ExportConfig | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
  onDownload: () => void;
};

export default function IntegrationHubDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Integration Config Input</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={8} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button style={primaryBtn} onClick={props.onRun} disabled={props.busy}>Build Integration Export</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.config}>Download integration-config.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Integration List & Workflow Builder</h3>
        {!props.config ? <p style={muted}>Run export to load integration list and workflow mapping.</p> : (
          <>
            <p><strong>Systems:</strong> {props.config.systems.length} · <strong>Workflows:</strong> {props.config.workflows.length}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['System', 'Type', 'Endpoint', 'Enabled'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{props.config.systems.map((s) => <tr key={s.id}><td style={td}>{s.name}</td><td style={td}>{s.type}</td><td style={td}>{s.endpoint}</td><td style={td}>{String(s.enabled)}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

const panel: CSSProperties = { border: '1px solid rgba(255,255,255,.12)', borderRadius: '10px', padding: '.9rem', background: 'rgba(255,255,255,.03)' };
const title: CSSProperties = { margin: '0 0 .5rem 0', fontSize: '1rem' };
const muted: CSSProperties = { opacity: 0.72, margin: '.2rem 0' };
const textarea: CSSProperties = { width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,.2)', background: '#07192b', color: '#eaf2ff', padding: '.7rem', fontFamily: 'monospace' };
const primaryBtn: CSSProperties = { background: '#5bd3ff', color: '#06111f', border: 0, borderRadius: '6px', padding: '.5rem .8rem', fontWeight: 700, cursor: 'pointer' };
const secondaryBtn: CSSProperties = { background: '#12324f', color: '#eaf2ff', border: '1px solid rgba(255,255,255,.2)', borderRadius: '6px', padding: '.5rem .8rem', fontWeight: 700, cursor: 'pointer' };
const th: CSSProperties = { textAlign: 'left', padding: '.45rem', borderBottom: '1px solid rgba(255,255,255,.12)', fontSize: '.74rem' };
const td: CSSProperties = { padding: '.45rem', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: '.8rem' };

