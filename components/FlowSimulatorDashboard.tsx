import type { SimulationReport } from '@/lib/simulationEngine';

export type SimulatorConfigState = {
  concurrency: number;
  arrivalRate: number;
  averageDurationMs: number;
  maxInteractions: number;
  burstMode: boolean;
  randomization: boolean;
};

type Props = {
  inputJson: string;
  onInputJsonChange: (value: string) => void;
  config: SimulatorConfigState;
  onConfigChange: (next: SimulatorConfigState) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunSimulation: () => void;
  onDownloadReport: () => void;
  isRunning: boolean;
  progress: number;
  report: SimulationReport | null;
  error: string | null;
};

function setConfig<K extends keyof SimulatorConfigState>(
  config: SimulatorConfigState,
  onConfigChange: (next: SimulatorConfigState) => void,
  key: K,
  value: SimulatorConfigState[K]
) {
  onConfigChange({ ...config, [key]: value });
}

function BarChart({
  title,
  data,
  color = '#5bd3ff',
}: {
  title: string;
  data: Record<string, number>;
  color?: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxValue = entries.length ? Math.max(...entries.map(([, v]) => v)) : 1;
  return (
    <section style={panelStyle}>
      <h4 style={subTitleStyle}>{title}</h4>
      {entries.length === 0 ? (
        <p style={mutedStyle}>No data</p>
      ) : (
        <div style={{ display: 'grid', gap: '.4rem' }}>
          {entries.map(([label, value]) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'rgba(255,255,255,.75)' }}>
                <span>{label}</span>
                <span>{value}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: '999px', overflow: 'hidden', height: '8px' }}>
                <div
                  style={{
                    width: `${Math.max(3, (value / maxValue) * 100)}%`,
                    background: color,
                    height: '100%',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TimelineMiniChart({
  title,
  points,
}: {
  title: string;
  points: Array<{ t: number; depth: number; queue: string }>;
}) {
  const subset = points.slice(-20);
  const maxDepth = subset.length ? Math.max(...subset.map((p) => p.depth), 1) : 1;
  return (
    <section style={panelStyle}>
      <h4 style={subTitleStyle}>{title}</h4>
      {subset.length === 0 ? (
        <p style={mutedStyle}>No timeline data</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '110px', borderBottom: '1px solid rgba(255,255,255,.12)', paddingBottom: '.25rem' }}>
          {subset.map((p, idx) => (
            <div
              key={`${p.queue}-${p.t}-${idx}`}
              title={`${p.queue} @ ${p.t}ms depth ${p.depth}`}
              style={{
                width: '8px',
                height: `${Math.max(4, (p.depth / maxDepth) * 100)}px`,
                background: '#7c3aed',
                borderRadius: '3px 3px 0 0',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StringTable({ title, items }: { title: string; items: string[] }) {
  return (
    <section style={panelStyle}>
      <h4 style={subTitleStyle}>{title}</h4>
      {items.length === 0 ? (
        <p style={mutedStyle}>None</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {items.slice(0, 20).map((item, idx) => (
            <li key={`${title}-${idx}`} style={{ color: 'rgba(255,255,255,.85)', marginBottom: '.25rem', fontSize: '.82rem' }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function FlowSimulatorDashboard(props: Props) {
  const {
    inputJson,
    onInputJsonChange,
    config,
    onConfigChange,
    onFileUpload,
    onRunSimulation,
    onDownloadReport,
    isRunning,
    progress,
    report,
    error,
  } = props;

  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panelStyle}>
        <h3 style={titleStyle}>Input Section</h3>
        <div style={{ display: 'grid', gap: '.7rem' }}>
          <label style={labelStyle}>
            Upload Flow JSON
            <input type="file" accept=".json,application/json" onChange={onFileUpload} style={{ display: 'block', marginTop: '.4rem' }} />
          </label>

          <label style={labelStyle}>
            Paste Flow JSON
            <textarea
              value={inputJson}
              onChange={(e) => onInputJsonChange(e.target.value)}
              rows={10}
              style={textareaStyle}
              placeholder='{"menu":"Main Menu","options":[{"key":1,"label":"Admissions","queue":"Admissions_Queue"}]}'
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.6rem' }}>
            <label style={labelStyle}>
              Concurrency
              <input
                type="number"
                min={1}
                value={config.concurrency}
                onChange={(e) => setConfig(config, onConfigChange, 'concurrency', Number(e.target.value))}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Arrival Rate (per sec)
              <input
                type="number"
                min={1}
                value={config.arrivalRate}
                onChange={(e) => setConfig(config, onConfigChange, 'arrivalRate', Number(e.target.value))}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Avg Duration (ms)
              <input
                type="number"
                min={1000}
                value={config.averageDurationMs}
                onChange={(e) => setConfig(config, onConfigChange, 'averageDurationMs', Number(e.target.value))}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Max Interactions
              <input
                type="number"
                min={1}
                value={config.maxInteractions}
                onChange={(e) => setConfig(config, onConfigChange, 'maxInteractions', Number(e.target.value))}
                style={inputStyle}
              />
            </label>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '.45rem', marginTop: '1.4rem' }}>
              <input
                type="checkbox"
                checked={config.burstMode}
                onChange={(e) => setConfig(config, onConfigChange, 'burstMode', e.target.checked)}
              />
              Burst Mode
            </label>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '.45rem', marginTop: '1.4rem' }}>
              <input
                type="checkbox"
                checked={config.randomization}
                onChange={(e) => setConfig(config, onConfigChange, 'randomization', e.target.checked)}
              />
              Randomization
            </label>
          </div>

          <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={onRunSimulation} disabled={isRunning} style={primaryBtn}>
              {isRunning ? 'Running Simulation...' : 'Run Simulation'}
            </button>
            <button onClick={onDownloadReport} disabled={!report} style={{ ...secondaryBtn, opacity: report ? 1 : 0.45 }}>
              Download simulation-report.json
            </button>
            {isRunning && (
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: '.74rem', color: 'rgba(255,255,255,.75)', marginBottom: '.2rem' }}>Progress: {progress}%</div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,.1)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: '#5bd3ff' }} />
                </div>
              </div>
            )}
          </div>
          {error && <p style={{ color: '#ff8f8f', margin: 0 }}>{error}</p>}
        </div>
      </section>

      {report && (
        <>
          <section style={panelStyle}>
            <h3 style={titleStyle}>Results Dashboard</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '.5rem' }}>
              <Metric label="Avg Routing Time" value={`${report.performance.averageRoutingTimeMs}ms`} />
              <Metric label="Max Routing Time" value={`${report.performance.maxRoutingTimeMs}ms`} />
              <Metric label="Successful Completions" value={String(report.performance.successfulCompletions)} />
              <Metric label="Abandoned Interactions" value={String(report.performance.abandonedInteractions)} />
              <Metric label="Errors" value={String(report.performance.errorCount)} />
              <Metric label="Warnings" value={String(report.performance.warningCount)} />
              <Metric label="Complexity Score" value={String(report.performance.flowComplexityScore)} />
              <Metric label="Bottlenecks" value={String(report.bottlenecks.length)} />
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '.85rem' }}>
            <BarChart title="Node Hit Frequency" data={report.performance.nodeHitFrequency} color="#5bd3ff" />
            <BarChart title="Node Failure Frequency" data={report.performance.nodeFailureFrequency} color="#ff7b7b" />
            <TimelineMiniChart title="Queue Depth Over Time" points={report.performance.queueDepthOverTime} />
            <BarChart title="Bottleneck Map" data={Object.fromEntries(report.bottlenecks.map((b, i) => [b.slice(0, 28) + (b.length > 28 ? '…' : ''), i + 1]))} color="#fbbf24" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.85rem' }}>
            <StringTable title="Warnings" items={report.warnings} />
            <StringTable title="Errors / Failures" items={report.failures} />
            <StringTable title="Recommendations" items={report.recommendations} />
          </div>

          <section style={panelStyle}>
            <h3 style={titleStyle}>Timeline of Events</h3>
            <div style={{ maxHeight: '260px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['t(ms)', 'interaction', 'event', 'node', 'detail'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.timeline.slice(0, 300).map((row, idx) => (
                    <tr key={`${row.interactionId}-${row.t}-${idx}`}>
                      <td style={tdStyle}>{row.t}</td>
                      <td style={tdStyle}>{row.interactionId}</td>
                      <td style={tdStyle}>{row.event}</td>
                      <td style={tdStyle}>{row.node}</td>
                      <td style={tdStyle}>{row.detail ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)', borderRadius: '6px', padding: '.55rem .65rem' }}>
      <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '8px',
  padding: '.9rem',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 .7rem 0',
  color: '#fff',
  fontSize: '.9rem',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
};

const subTitleStyle: React.CSSProperties = {
  margin: '0 0 .55rem 0',
  color: '#fff',
  fontSize: '.82rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.74rem',
  color: 'rgba(255,255,255,.8)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '.35rem',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.14)',
  color: '#e8f0fe',
  borderRadius: '6px',
  padding: '.5rem .65rem',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: '.35rem',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.14)',
  borderRadius: '6px',
  color: '#e8f0fe',
  padding: '.7rem .8rem',
  fontFamily: "'Fira Mono', 'Courier New', monospace",
  lineHeight: 1.5,
};

const primaryBtn: React.CSSProperties = {
  background: '#5bd3ff',
  color: '#06111f',
  border: 'none',
  borderRadius: '7px',
  padding: '.7rem 1rem',
  fontWeight: 800,
  fontSize: '.76rem',
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)',
  color: 'rgba(255,255,255,.85)',
  border: '1px solid rgba(255,255,255,.16)',
  borderRadius: '7px',
  padding: '.7rem 1rem',
  fontWeight: 700,
  fontSize: '.76rem',
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,.45)',
  fontSize: '.82rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '.68rem',
  color: 'rgba(255,255,255,.7)',
  borderBottom: '1px solid rgba(255,255,255,.1)',
  padding: '.4rem .45rem',
  position: 'sticky',
  top: 0,
  background: '#0a1a2a',
};

const tdStyle: React.CSSProperties = {
  fontSize: '.74rem',
  color: 'rgba(255,255,255,.85)',
  borderBottom: '1px solid rgba(255,255,255,.06)',
  padding: '.35rem .45rem',
  verticalAlign: 'top',
};

