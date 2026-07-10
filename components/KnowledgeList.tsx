import type { KnowledgeCategory, KnowledgeEntry } from '@/lib/knowledgeStore';

type Props = {
  entries: KnowledgeEntry[];
  selectedEntryId: string | null;
  searchQuery: string;
  selectedCategory: 'All' | KnowledgeCategory;
  selectedTag: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: 'All' | KnowledgeCategory) => void;
  onTagChange: (value: string) => void;
  onSelectEntry: (entry: KnowledgeEntry) => void;
};

const CATEGORIES: Array<'All' | KnowledgeCategory> = [
  'All',
  'general',
  'contact_center',
  'routing',
  'scripts',
  'prompts',
];

export default function KnowledgeList({
  entries,
  selectedEntryId,
  searchQuery,
  selectedCategory,
  selectedTag,
  onSearchChange,
  onCategoryChange,
  onTagChange,
  onSelectEntry,
}: Props) {
  const tagOptions = Array.from(new Set(entries.flatMap((entry) => entry.tags))).sort();

  return (
    <div>
      <label style={labelStyle}>
        Search
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search knowledge..."
          style={inputStyle}
        />
      </label>

      <label style={{ ...labelStyle, marginTop: '.6rem' }}>
        Category
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as 'All' | KnowledgeCategory)}
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
        {entries.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '.85rem' }}>No entries found.</p>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              style={{
                background: selectedEntryId === entry.id ? 'rgba(91,211,255,.14)' : 'rgba(255,255,255,.03)',
                border: selectedEntryId === entry.id ? '1px solid rgba(91,211,255,.35)' : '1px solid rgba(255,255,255,.12)',
                borderRadius: '6px',
                textAlign: 'left',
                padding: '.55rem .65rem',
                color: '#e8f0fe',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '.82rem', fontWeight: 700 }}>{entry.title}</div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.55)', textTransform: 'uppercase' }}>
                {entry.category}
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

