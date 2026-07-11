import type { CSSProperties } from 'react';

type Rewrite = {
  originalFlow: Record<string, unknown>;
  rewrittenFlow: Record<string, unknown>;
  diff: { structural: string[]; routing: string[] };
  rationale: { whatChanged: string[]; why: string[]; expectedImpact: string[] };
  recommendations: string[];
  summary: { changedNodes: number; changedRoutes: number };
};

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  rewrite: Rewrite | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
  onDownloadFlow: () => void;
  onDownloadRationale: () => void;
};

export default function FlowRewriteDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Rewrite Prompt + Base Flow</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={9} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button style={primaryBtn} onClick={props.onRun} disabled={props.busy}>Generate/Rewrite Flow</button>
          <button style={secondaryBtn} onClick={props.onDownloadFlow} disabled={!props.rewrite}>Download rewritten-flow.json</button>
          <button style={secondaryBtn} onClick={props.onDownloadRationale} disabled={!props.rewrite}>Download rewrite-rationale.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Rewrite Results</h3>
        {!props.rewrite ? <p style={muted}>Run rewrite to view original, rewritten, diff, and rationale.</p> : (
          <>
            <p><strong>Changed nodes:</strong> {props.rewrite.summary.changedNodes} · <strong>Changed routes:</strong> {props.rewrite.summary.changedRoutes}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
              <pre style={pre}>Original Flow{'\n'}{JSON.stringify(props.rewrite.originalFlow, null, 2)}</pre>
              <pre style={pre}>Rewritten Flow{'\n'}{JSON.stringify(props.rewrite.rewrittenFlow, null, 2)}</pre>
            </div>
            <p style={{ marginTop: '.5rem' }}><strong>Diff:</strong> {props.rewrite.diff.structural.concat(props.rewrite.diff.routing).join(' | ')}</p>
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
const pre: CSSProperties = { margin: 0, whiteSpace: 'pre-wrap', background: '#07192b', border: '1px solid rgba(255,255,255,.15)', borderRadius: '8px', padding: '.6rem', maxHeight: '260px', overflow: 'auto' };

