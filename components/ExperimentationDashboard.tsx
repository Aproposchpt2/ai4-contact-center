import type { CSSProperties } from 'react';

type Result = {
  metricsByVariant: Array<{
    variantId: string;
    variantName: string;
    metrics: { csat: number; ahtSeconds: number; resolutionRate: number; dropoffRate: number; sentiment: number };
  }>;
  winner: { variantId: string; reason: string };
  summary: { sampleSize: number; confidence: number };
};

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  result: Result | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
  onDownload: () => void;
};

export default function ExperimentationDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Experiment Builder</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={8} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button style={primaryBtn} onClick={props.onRun} disabled={props.busy}>Run Experiment</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.result}>Download experiment-report.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Results</h3>
        {!props.result ? <p style={muted}>Run the experiment to compare variants and select a winner.</p> : (
          <>
            <p><strong>Winner:</strong> {props.result.winner.variantId} · {props.result.winner.reason}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Variant', 'CSAT', 'AHT', 'Resolution', 'Drop-off', 'Sentiment'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{props.result.metricsByVariant.map((v) => (
                <tr key={v.variantId}>
                  <td style={td}>{v.variantName}</td>
                  <td style={td}>{v.metrics.csat}</td>
                  <td style={td}>{v.metrics.ahtSeconds}</td>
                  <td style={td}>{v.metrics.resolutionRate}</td>
                  <td style={td}>{v.metrics.dropoffRate}</td>
                  <td style={td}>{v.metrics.sentiment}</td>
                </tr>
              ))}</tbody>
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

