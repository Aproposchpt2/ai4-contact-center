import type { KnowledgeEntry } from '@/lib/knowledgeStore';

type Props = {
  entry: KnowledgeEntry | null;
};

export default function KnowledgeViewer({ entry }: Props) {
  if (!entry) {
    return <p style={{ color: 'rgba(255,255,255,.45)' }}>Select an entry to view full knowledge content.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '.7rem' }}>
      <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>{entry.title}</h3>
      <div style={{ fontSize: '.74rem', color: 'rgba(255,255,255,.65)', display: 'grid', gap: '.2rem' }}>
        <span><strong>Category:</strong> {entry.category}</span>
        <span><strong>Created:</strong> {entry.created_at}</span>
        <span><strong>Updated:</strong> {entry.updated_at}</span>
      </div>
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        {entry.tags.length === 0 ? (
          <span style={{ color: 'rgba(255,255,255,.45)', fontSize: '.8rem' }}>No tags</span>
        ) : (
          entry.tags.map((tag) => (
            <span
              key={tag}
              style={{
                background: 'rgba(91,211,255,.12)',
                border: '1px solid rgba(91,211,255,.22)',
                borderRadius: '999px',
                padding: '.15rem .55rem',
                fontSize: '.72rem',
              }}
            >
              {tag}
            </span>
          ))
        )}
      </div>
      <pre
        style={{
          margin: 0,
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: '8px',
          color: '#e8f0fe',
          padding: '.9rem',
          whiteSpace: 'pre-wrap',
          fontFamily: "'Inter', 'Jost', sans-serif",
          fontSize: '.9rem',
          lineHeight: 1.6,
        }}
      >
        {entry.content}
      </pre>
    </div>
  );
}

