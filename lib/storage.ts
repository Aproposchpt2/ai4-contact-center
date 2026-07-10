/**
 * storage.ts — Client-side flow persistence via localStorage.
 * Safe to import in browser only (guard with typeof window checks if needed).
 */

export interface SavedFlow {
  id: string;
  name: string;
  text: string;
  parsed: object;
  createdAt: string;
}

const KEY = 'ai4cc_flows';

function load(): SavedFlow[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as SavedFlow[];
  } catch {
    return [];
  }
}

function persist(flows: SavedFlow[]): void {
  localStorage.setItem(KEY, JSON.stringify(flows));
}

export function saveFlow(name: string, text: string, parsed: object): SavedFlow {
  const flows = load();
  const flow: SavedFlow = {
    id:        crypto.randomUUID(),
    name:      name || 'Untitled Flow',
    text,
    parsed,
    createdAt: new Date().toISOString(),
  };
  flows.unshift(flow);
  persist(flows);
  return flow;
}

export function getFlows(): SavedFlow[] {
  return load();
}

export function deleteFlow(id: string): void {
  persist(load().filter(f => f.id !== id));
}

export function getFlow(id: string): SavedFlow | undefined {
  return load().find(f => f.id === id);
}
