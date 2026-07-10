import type { PromptCategory, PromptRecord } from '@/lib/promptStore';

type Props = {
  prompts: PromptRecord[];
  selectedPromptId: string | null;
  searchQuery: string;
  selectedCategory: 'All' | PromptCategory;
  selectedTag: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: 'All' | PromptCategory) => void;
  onTagChange: (value: string) => void;
  onSelectPrompt: (prompt: PromptRecord) => void;
};

const CATEGORIES: Array<'All' | PromptCategory> = ['All', 'builder', 'troubleshooter', 'designer', 'routing'];

export default function PromptList({
  prompts,
  selectedPromptId,
  searchQuery,
  selectedCategory,
  selectedTag,
  onSearchChange,
  onCategoryChange,
  onTagChange,
  onSelectPrompt,
}: Props) {
  const tagOptions = Array.from(new Set(prompts.flatMap((prompt) => prompt.tags))).sort();

  return (
    <div>
      <label style={labelStyle}>
        Search
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search prompts..."
          style={inputStyle}
        />
      </label>

      <label style={{ ...labelStyle, marginTop: '.6rem' }}>
        Category
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as 'All' | PromptCategory)}
          style={inputStyle}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label style={{ ...labelStyle, marginTop: '.6rem' }}>
        Tag
        <select value={selectedTag} onChange={(e) => onTagChange(e.target.value)} style={inputStyle}>
          <option value="">All tags</option>
          {tagOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>

      <div style={{ marginTop: '.8rem', display: 'grid', gap: '.45rem' }}>
        {prompts.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '.85rem' }}>No prompts found.</p>
        ) : (
          prompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => onSelectPrompt(prompt)}
              style={{
                background: selectedPromptId === prompt.id ? 'rgba(91,211,255,.14)' : 'rgba(255,255,255,.03)',
                border: selectedPromptId === prompt.id ? '1px solid rgba(91,211,255,.35)' : '1px solid rgba(255,255,255,.12)',
                borderRadius: '6px',
                textAlign: 'left',
                padding: '.55rem .65rem',
                color: '#e8f0fe',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '.82rem', fontWeight: 700 }}>{prompt.name}</div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.55)', textTransform: 'uppercase' }}>
                {prompt.category} · v{prompt.version}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.74rem',
  color: 'rgba(255,255,255,.75)',
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

