import type { CSSProperties } from 'react';

type Report = {
  rules: Array<{ id: string; name: string; target: string; pattern: string; severity: string }>;
  violations: Array<{ ruleId: string; assetId: string; severity: string; message: string }>;
  recommendations: string[];
  summary: { totalRules: number; scannedAssets: number; violations: number; highSeverity: number };
};

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  report: Report | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
  onDownload: () => void;
};

export default function ComplianceAutomationDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Rule & Asset Input</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={8} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button style={primaryBtn} onClick={props.onRun} disabled={props.busy}>Run Compliance Scan</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.report}>Download compliance-report.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Violations</h3>
        {!props.report ? <p style={muted}>Run scan to view violations and remediation recommendations.</p> : (
          <>
            <p><strong>Total Violations:</strong> {props.report.summary.violations} · <strong>High Severity:</strong> {props.report.summary.highSeverity}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Rule', 'Asset', 'Severity', 'Message'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{props.report.violations.map((v, idx) => <tr key={`${v.ruleId}-${idx}`}><td style={td}>{v.ruleId}</td><td style={td}>{v.assetId}</td><td style={td}>{v.severity}</td><td style={td}>{v.message}</td></tr>)}</tbody>
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

