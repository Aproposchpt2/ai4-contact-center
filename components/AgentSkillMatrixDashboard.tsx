import type { CSSProperties } from 'react';

type Analysis = {
  agents: Array<{ agentId: string; agentName: string; skills: Array<{ skill: string; proficiency: number }>; channels: string[] }>;
  skills: string[];
  mappings: Array<{ skill: string; intents: string[]; channels: string[]; queues: string[]; flows: string[] }>;
  gaps: Array<{ intent: string; requiredSkill: string; requiredAgents: number; coveredAgents: number; gap: number }>;
  recommendations: string[];
  summary: { totalAgents: number; totalSkills: number; underCoveredIntents: number };
};

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  analysis: Analysis | null;
  busy: boolean;
  error: string | null;
  onRun: () => void;
  onDownload: () => void;
};

export default function AgentSkillMatrixDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Agent Skill Matrix Input</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={8} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button style={primaryBtn} onClick={props.onRun} disabled={props.busy}>Analyze Skill Coverage</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.analysis}>Download skill-matrix.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Gap Analysis</h3>
        {!props.analysis ? <p style={muted}>Run analysis to view matrix, mappings, and skill gaps.</p> : (
          <>
            <p><strong>Agents:</strong> {props.analysis.summary.totalAgents} · <strong>Skills:</strong> {props.analysis.summary.totalSkills} · <strong>Under-covered intents:</strong> {props.analysis.summary.underCoveredIntents}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Intent', 'Required Skill', 'Required', 'Covered', 'Gap'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{props.analysis.gaps.map((g, idx) => <tr key={`${g.intent}-${idx}`}><td style={td}>{g.intent}</td><td style={td}>{g.requiredSkill}</td><td style={td}>{g.requiredAgents}</td><td style={td}>{g.coveredAgents}</td><td style={td}>{g.gap}</td></tr>)}</tbody>
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

