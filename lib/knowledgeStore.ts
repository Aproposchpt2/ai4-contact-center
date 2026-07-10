export type KnowledgeCategory =
  | 'general'
  | 'contact_center'
  | 'routing'
  | 'scripts'
  | 'prompts';

export type KnowledgeEntry = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type KnowledgeCreateInput = {
  title: string;
  category: KnowledgeCategory;
  content: string;
  tags?: string[];
};

export type KnowledgeUpdateInput = Partial<{
  title: string;
  category: KnowledgeCategory;
  content: string;
  tags: string[];
}>;

let entries: KnowledgeEntry[] = [];

function makeId(): string {
  return `knowledge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanTags(tags?: string[]): string[] {
  if (!tags) return [];
  const cleaned = tags.map((tag) => tag.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
}

export function getEntries(): KnowledgeEntry[] {
  return [...entries].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getEntryById(id: string): KnowledgeEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

export function createEntry(input: KnowledgeCreateInput): KnowledgeEntry {
  const now = new Date().toISOString();
  const entry: KnowledgeEntry = {
    id: makeId(),
    title: input.title.trim() || 'Untitled Knowledge',
    category: input.category,
    content: input.content,
    tags: cleanTags(input.tags),
    created_at: now,
    updated_at: now,
  };
  entries.push(entry);
  return entry;
}

export function updateEntry(id: string, updates: KnowledgeUpdateInput): KnowledgeEntry | null {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) return null;

  const current = entries[index];
  const next: KnowledgeEntry = {
    ...current,
    ...updates,
    title: updates.title !== undefined ? updates.title.trim() : current.title,
    tags: updates.tags !== undefined ? cleanTags(updates.tags) : current.tags,
    updated_at: new Date().toISOString(),
  };
  entries[index] = next;
  return next;
}

export function deleteEntry(id: string): boolean {
  const originalLength = entries.length;
  entries = entries.filter((entry) => entry.id !== id);
  return entries.length < originalLength;
}

export function importEntries(imported: KnowledgeEntry[]): KnowledgeEntry[] {
  const now = new Date().toISOString();
  entries = imported.map((entry) => ({
    id: entry.id || makeId(),
    title: entry.title?.trim() || 'Untitled Knowledge',
    category: entry.category,
    content: entry.content || '',
    tags: cleanTags(entry.tags),
    created_at: entry.created_at || now,
    updated_at: entry.updated_at || now,
  }));
  return getEntries();
}

export function exportEntries(): KnowledgeEntry[] {
  return getEntries();
}

