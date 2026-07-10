import type { KnowledgeCategory, KnowledgeEntry } from '@/lib/knowledgeStore';

type KnowledgeDraft = {
  id?: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  tagsText: string;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  draft: KnowledgeDraft | null;
  onChange: (nextDraft: KnowledgeDraft) => void;
  onSave: () => void;
  onDelete: () => void;
};

const CATEGORIES: KnowledgeCategory[] = [
  'general',
  'contact_center',
  'routing',
  'scripts',
  'prompts',
];

export function knowledgeToDraft(entry: KnowledgeEntry): KnowledgeDraft {
  return {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    content: entry.content,
    tagsText: entry.tags.join(', '),
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  };
}

export function emptyKnowledgeDraft(): KnowledgeDraft {
  return {
    title: '',
    category: 'general',
    content: '',
    tagsText: '',
  };
}

export default function KnowledgeEditor({ draft, onChange, onSave, onDelete }: Props) {
  if (!draft) {
    return <p style={{ color: 'rgba(255,255,255,.45)' }}>Select an entry or add new knowledge.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '.8rem' }}>
      <label style={labelStyle}>
        Title
        <input
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Category
        <select
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value as KnowledgeCategory })}
          style={inputStyle}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Tags (comma-separated)
        <input
          value={draft.tagsText}
          onChange={(e) => onChange({ ...draft, tagsText: e.target.value })}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Content
        <textarea
          value={draft.content}
          onChange={(e) => onChange({ ...draft, content: e.target.value })}
          rows={10}
          style={{ ...inputStyle, fontFamily: "'Fira Mono', 'Courier New', monospace" }}
        />
      </label>

      <label style={readonlyLabelStyle}>
        Created at
        <input value={draft.created_at ?? '-'} readOnly style={readonlyInputStyle} />
      </label>
      <label style={readonlyLabelStyle}>
        Updated at
        <input value={draft.updated_at ?? '-'} readOnly style={readonlyInputStyle} />
      </label>

      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
        <button onClick={onSave} style={saveBtn}>
          Save
        </button>
        <button onClick={onDelete} disabled={!draft.id} style={{ ...deleteBtn, opacity: draft.id ? 1 : 0.45 }}>
          Delete
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.74rem',
  color: 'rgba(255,255,255,.75)',
};

const readonlyLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.72rem',
  color: 'rgba(255,255,255,.55)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '.35rem',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.14)',
  color: '#e8f0fe',
  borderRadius: '6px',
  padding: '.55rem .7rem',
};

const readonlyInputStyle: React.CSSProperties = {
  ...inputStyle,
  color: 'rgba(255,255,255,.6)',
};

const saveBtn: React.CSSProperties = {
  background: '#5bd3ff',
  color: '#06111f',
  border: 'none',
  borderRadius: '6px',
  padding: '.55rem .9rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const deleteBtn: React.CSSProperties = {
  background: 'rgba(255,90,90,.16)',
  color: '#ffdede',
  border: '1px solid rgba(255,90,90,.35)',
  borderRadius: '6px',
  padding: '.55rem .9rem',
  fontWeight: 700,
  cursor: 'pointer',
};

