import { SavedFlow } from '@/lib/storage';

interface Props {
  flow: SavedFlow;
  onOpen: (flow: SavedFlow) => void;
  onDelete: (id: string) => void;
}

export default function FlowCard({ flow, onOpen, onDelete }: Props) {
  const date = new Date(flow.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const time = new Date(flow.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
  const parsed = flow.parsed as { options?: Array<{ label: string }> };
  const optionCount = parsed?.options?.length ?? 0;

  return (
    <div style={{
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.08)',
      borderRadius: '10px',
      padding: '1.4rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '.7rem',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <h3 style={{ fontSize: '.95rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
          {flow.name}
        </h3>
        <button
          onClick={() => onDelete(flow.id)}
          title="Delete flow"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,.2)', fontSize: '1.1rem', lineHeight: 1,
            flexShrink: 0, padding: '0 2px',
          }}
        >×</button>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)', fontFamily: 'monospace' }}>
          {optionCount} option{optionCount !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.25)' }}>
          {date} · {time}
        </span>
      </div>

      {/* Text preview */}
      <p style={{
        fontSize: '.76rem', color: 'rgba(255,255,255,.35)',
        lineHeight: 1.5, margin: 0,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {flow.text}
      </p>

      {/* Action */}
      <button
        onClick={() => onOpen(flow)}
        style={{
          marginTop: '.2rem',
          background: 'rgba(91,211,255,.1)',
          border: '1px solid rgba(91,211,255,.25)',
          color: '#5bd3ff',
          borderRadius: '6px',
          padding: '.55rem 1rem',
          fontSize: '.7rem', fontWeight: 700,
          letterSpacing: '.12em', textTransform: 'uppercase',
          cursor: 'pointer', alignSelf: 'flex-start',
        }}
      >
        Open in Builder →
      </button>
    </div>
  );
}
