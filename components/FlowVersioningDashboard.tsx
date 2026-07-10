import React from 'react';
import type {
  AuditEvent,
  BranchRecord,
  DiffReport,
  MergeReport,
  VersionRecord,
} from '@/lib/versioningEngine';

type Props = {
  inputJson: string;
  onInputJsonChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  user: string;
  onUserChange: (value: string) => void;
  currentBranch: string;
  branches: BranchRecord[];
  versions: VersionRecord[];
  selectedA: string;
  selectedB: string;
  onSelectA: (value: string) => void;
  onSelectB: (value: string) => void;
  diffReport: DiffReport | null;
  mergeReport: MergeReport | null;
  auditLog: AuditEvent[];
  isBusy: boolean;
  error: string | null;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveVersion: () => void;
  onRunDiff: () => void;
  onRollback: (versionId: string) => void;
  onDownloadVersion: (versionId: string) => void;
  onCreateBranch: (name: string) => void;
  onSwitchBranch: (name: string) => void;
  onMergeBranch: (sourceBranch: string) => void;
  onViewVersion: (versionId: string) => void;
};

export default function FlowVersioningDashboard(props: Props) {
  const [branchName, setBranchName] = React.useState('');
  const [mergeSourceBranch, setMergeSourceBranch] = React.useState('main');
  const branchNames = props.branches.map((b) => b.name);

  React.useEffect(() => {
    if (!branchNames.includes(mergeSourceBranch) && branchNames.length > 0) {
      setMergeSourceBranch(branchNames[0]);
    }
  }, [mergeSourceBranch, branchNames]);

  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panelStyle}>
        <h3 style={titleStyle}>Input & Save Version</h3>
        <label style={labelStyle}>
          Upload/Paste Flow JSON
          <input type="file" accept=".json,application/json" onChange={props.onFileUpload} style={{ display: 'block', marginTop: '.4rem' }} />
          <textarea
            value={props.inputJson}
            onChange={(e) => props.onInputJsonChange(e.target.value)}
            rows={10}
            style={textareaStyle}
            placeholder='{"menu":"Main Menu","options":[]}'
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '.6rem', marginTop: '.6rem' }}>
          <label style={labelStyle}>
            Notes
            <input value={props.notes} onChange={(e) => props.onNotesChange(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            User
            <input value={props.user} onChange={(e) => props.onUserChange(e.target.value)} style={inputStyle} />
          </label>
          <button onClick={props.onSaveVersion} disabled={props.isBusy} style={{ ...primaryBtn, alignSelf: 'end' }}>
            Save Version
          </button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f', margin: '.6rem 0 0 0' }}>{props.error}</p>}
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Version List</h3>
        <div style={{ maxHeight: '260px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Version', 'Timestamp', 'Branch', 'Notes', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.versions.map((v) => (
                <tr key={v.id}>
                  <td style={tdStyle}>v{v.versionNumber}</td>
                  <td style={tdStyle}>{v.timestamp}</td>
                  <td style={tdStyle}>{v.branch}</td>
                  <td style={tdStyle}>{v.notes}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                      <button onClick={() => props.onViewVersion(v.id)} style={miniBtn}>View</button>
                      <button onClick={() => props.onSelectA(v.id)} style={miniBtn}>Set A</button>
                      <button onClick={() => props.onSelectB(v.id)} style={miniBtn}>Set B</button>
                      <button onClick={() => props.onRollback(v.id)} style={miniBtn}>Rollback</button>
                      <button onClick={() => props.onDownloadVersion(v.id)} style={miniBtn}>Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Diff Viewer</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '.6rem', marginBottom: '.6rem' }}>
          <label style={labelStyle}>
            Version A
            <select value={props.selectedA} onChange={(e) => props.onSelectA(e.target.value)} style={inputStyle}>
              <option value="">Select version</option>
              {props.versions.map((v) => (
                <option key={`a-${v.id}`} value={v.id}>v{v.versionNumber} ({v.branch})</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Version B
            <select value={props.selectedB} onChange={(e) => props.onSelectB(e.target.value)} style={inputStyle}>
              <option value="">Select version</option>
              {props.versions.map((v) => (
                <option key={`b-${v.id}`} value={v.id}>v{v.versionNumber} ({v.branch})</option>
              ))}
            </select>
          </label>
          <button onClick={props.onRunDiff} style={{ ...primaryBtn, alignSelf: 'end' }}>Diff</button>
        </div>

        {!props.diffReport ? (
          <p style={mutedStyle}>Select two versions to compare.</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.5rem', marginBottom: '.5rem' }}>
              <Metric label="Added" value={props.diffReport.summary.added} />
              <Metric label="Removed" value={props.diffReport.summary.removed} />
              <Metric label="Changed" value={props.diffReport.summary.changed} />
            </div>
            <div style={{ maxHeight: '220px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px', marginBottom: '.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Action', 'Path', 'Before', 'After'].map((h) => (
                      <th key={`d-${h}`} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {props.diffReport.structuralDiff.map((d, idx) => (
                    <tr key={`${d.key}-${idx}`}>
                      <td style={tdStyle}>{d.action}</td>
                      <td style={tdStyle}>{d.key}</td>
                      <td style={tdStyle}>{typeof d.before === 'string' ? d.before : JSON.stringify(d.before)}</td>
                      <td style={tdStyle}>{typeof d.after === 'string' ? d.after : JSON.stringify(d.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <StringList title="Logic Diff" items={props.diffReport.logicDiff} />
            <StringList title="Routing Diff" items={props.diffReport.routingDiff} />
            <StringList title="Recommendations" items={props.diffReport.recommendations} />
          </>
        )}
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Branch Manager</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr auto auto', gap: '.6rem', marginBottom: '.6rem' }}>
          <label style={labelStyle}>
            New Branch Name
            <input value={branchName} onChange={(e) => setBranchName(e.target.value)} style={inputStyle} />
          </label>
          <button
            onClick={() => {
              if (branchName.trim()) {
                props.onCreateBranch(branchName.trim());
                setBranchName('');
              }
            }}
            style={{ ...primaryBtn, alignSelf: 'end' }}
          >
            Create Branch
          </button>
          <button onClick={() => props.onSwitchBranch(props.currentBranch)} style={{ ...secondaryBtn, alignSelf: 'end' }}>
            Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr auto auto', gap: '.6rem', marginBottom: '.6rem' }}>
          <label style={labelStyle}>
            Switch Branch
            <select
              value={props.currentBranch}
              onChange={(e) => props.onSwitchBranch(e.target.value)}
              style={inputStyle}
            >
              {props.branches.map((b) => (
                <option key={`switch-${b.name}`} value={b.name}>{b.name}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Merge Source Branch
            <select
              value={mergeSourceBranch}
              onChange={(e) => setMergeSourceBranch(e.target.value)}
              style={inputStyle}
            >
              {props.branches.map((b) => (
                <option key={`merge-${b.name}`} value={b.name}>{b.name}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => props.onMergeBranch(mergeSourceBranch)}
            style={{ ...primaryBtn, alignSelf: 'end' }}
            disabled={mergeSourceBranch === 'main'}
          >
            Merge → main
          </button>
        </div>

        {props.mergeReport && (
          <div style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', padding: '.6rem' }}>
            <div style={{ fontSize: '.78rem', color: '#fff', marginBottom: '.35rem' }}>
              Merge Status: <strong>{props.mergeReport.status}</strong>
            </div>
            <StringList title="Auto-Merged Keys" items={props.mergeReport.autoMergedKeys} />
            <StringList title="Merge Recommendations" items={props.mergeReport.recommendations} />
            {props.mergeReport.conflicts.length > 0 && (
              <div>
                <h4 style={subTitle}>Conflicts</h4>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {props.mergeReport.conflicts.map((c, idx) => (
                    <li key={`conf-${c.key}-${idx}`} style={liStyle}>
                      {c.key}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Audit Log</h3>
        {props.auditLog.length === 0 ? (
          <p style={mutedStyle}>No audit events yet.</p>
        ) : (
          <div style={{ maxHeight: '220px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Time', 'Type', 'Message'].map((h) => (
                    <th key={`a-${h}`} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.auditLog.map((event) => (
                  <tr key={event.id}>
                    <td style={tdStyle}>{event.timestamp}</td>
                    <td style={tdStyle}>{event.type}</td>
                    <td style={tdStyle}>{event.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StringList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginBottom: '.45rem' }}>
      <h4 style={subTitle}>{title}</h4>
      {items.length === 0 ? (
        <p style={mutedStyle}>None</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`} style={liStyle}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
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
const subTitle: React.CSSProperties = {
  margin: '0 0 .35rem 0',
  color: '#fff',
  fontSize: '.78rem',
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
const miniBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)',
  color: '#e8f0fe',
  border: '1px solid rgba(255,255,255,.16)',
  borderRadius: '5px',
  padding: '.25rem .45rem',
  fontSize: '.65rem',
  cursor: 'pointer',
};
const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,.45)',
  fontSize: '.82rem',
};
const liStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,.85)',
  marginBottom: '.25rem',
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
