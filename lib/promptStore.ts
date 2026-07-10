export type PromptCategory = 'builder' | 'troubleshooter' | 'designer' | 'routing';

export type PromptRecord = {
  id: string;
  name: string;
  category: PromptCategory;
  content: string;
  tags: string[];
  version: number;
  created_at: string;
  updated_at: string;
};

export type PromptCreateInput = {
  name: string;
  category: PromptCategory;
  content: string;
  tags?: string[];
};

export type PromptUpdateInput = Partial<{
  name: string;
  category: PromptCategory;
  content: string;
  tags: string[];
}>;

let prompts: PromptRecord[] = [];

function makeId(): string {
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dedupeTags(tags?: string[]): string[] {
  if (!tags) return [];
  const cleaned = tags.map((t) => t.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
}

export function getPrompts(): PromptRecord[] {
  return [...prompts].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getPromptById(id: string): PromptRecord | undefined {
  return prompts.find((prompt) => prompt.id === id);
}

export function createPrompt(input: PromptCreateInput): PromptRecord {
  const now = new Date().toISOString();
  const prompt: PromptRecord = {
    id: makeId(),
    name: input.name.trim(),
    category: input.category,
    content: input.content,
    tags: dedupeTags(input.tags),
    version: 1,
    created_at: now,
    updated_at: now,
  };
  prompts.push(prompt);
  return prompt;
}

export function updatePrompt(id: string, updates: PromptUpdateInput): PromptRecord | null {
  const index = prompts.findIndex((prompt) => prompt.id === id);
  if (index < 0) return null;

  const current = prompts[index];
  const next: PromptRecord = {
    ...current,
    ...updates,
    tags: updates.tags ? dedupeTags(updates.tags) : current.tags,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    version: current.version + 1,
    updated_at: new Date().toISOString(),
  };
  prompts[index] = next;
  return next;
}

export function deletePrompt(id: string): boolean {
  const originalLength = prompts.length;
  prompts = prompts.filter((prompt) => prompt.id !== id);
  return prompts.length < originalLength;
}

export function importPrompts(importedPrompts: PromptRecord[]): PromptRecord[] {
  const now = new Date().toISOString();
  prompts = importedPrompts.map((item) => ({
    id: item.id || makeId(),
    name: item.name?.trim() || 'Untitled Prompt',
    category: item.category,
    content: item.content || '',
    tags: dedupeTags(item.tags),
    version: Number.isFinite(item.version) ? item.version : 1,
    created_at: item.created_at || now,
    updated_at: item.updated_at || now,
  }));
  return getPrompts();
}

export function exportPrompts(): PromptRecord[] {
  return getPrompts();
}

