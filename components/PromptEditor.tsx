import type { PromptCategory, PromptRecord } from '@/lib/promptStore';

type PromptDraft = {
  id?: string;
  name: string;
  category: PromptCategory;
  content: string;
  tagsText: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  draft: PromptDraft | null;
  onChange: (nextDraft: PromptDraft) => void;
  onSave: () => void;
  onDelete: () => void;
};

const CATEGORIES: PromptCategory[] = ['builder', 'troubleshooter', 'designer', 'routing'];

export function promptToDraft(prompt: PromptRecord): PromptDraft {
  return {
    id: prompt.id,
    name: prompt.name,
    category: prompt.category,
    content: prompt.content,
    tagsText: prompt.tags.join(', '),
    version: prompt.version,
    created_at: prompt.created_at,
    updated_at: prompt.updated_at,
  };
}

export function emptyPromptDraft(): PromptDraft {
  return {
    name: '',
    category: 'builder',
    content: '',
    tagsText: '',
  };
}

export default function PromptEditor({ draft, onChange, onSave, onDelete }: Props) {
  if (!draft) {
    return <p style={{ color: 'rgba(255,255,255,.45)' }}>Select a prompt or create a new one.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '.8rem' }}>
      <label style={labelStyle}>
        Name
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Category
        <select
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value as PromptCategory })}
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
        Version
        <input value={String(draft.version ?? 1)} readOnly style={readonlyInputStyle} />
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

