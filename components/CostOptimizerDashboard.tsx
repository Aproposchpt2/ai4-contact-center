import type { CSSProperties } from 'react';
import type { CostReport } from '@/lib/costOptimizationEngine';

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  report: CostReport | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
  onDownload: () => void;
};

export default function CostOptimizerDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Cost Modeling Input</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={8} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button style={primaryBtn} onClick={props.onRun} disabled={props.busy}>Analyze Cost & ROI</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.report}>Download cost-report.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Cost Breakdown & ROI</h3>
        {!props.report ? <p style={muted}>Run analysis to view cost breakdown and recommendations.</p> : (
          <>
            <p><strong>Total Monthly Cost:</strong> ${props.report.totalMonthlyCost.toLocaleString()} · <strong>Projected Savings:</strong> ${props.report.projectedSavings.toLocaleString()} · <strong>ROI:</strong> {props.report.roiProjectionPct}%</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Channel', 'Monthly Cost'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{props.report.costBreakdown.map((c) => <tr key={c.channel}><td style={td}>{c.channel}</td><td style={td}>${c.monthlyCost.toLocaleString()}</td></tr>)}</tbody>
            </table>
            <ul style={{ margin: '.5rem 0 0 .9rem' }}>{props.report.recommendations.map((r, idx) => <li key={`r-${idx}`}>{r}</li>)}</ul>
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

