import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createEntry,
  deleteEntry,
  exportEntries,
  getEntries,
  importEntries,
  updateEntry,
  type KnowledgeCategory,
  type KnowledgeEntry,
  type KnowledgeUpdateInput,
} from '@/lib/knowledgeStore';

type ErrorResponse = { error: string };

const VALID_CATEGORIES: KnowledgeCategory[] = [
  'general',
  'contact_center',
  'routing',
  'scripts',
  'prompts',
];

function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return typeof value === 'string' && VALID_CATEGORIES.includes(value as KnowledgeCategory);
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<KnowledgeEntry[] | KnowledgeEntry | { ok: true } | ErrorResponse>
) {
  const action = req.query.action;
  const actionValue = Array.isArray(action) ? action[0] : action;

  if (req.method === 'GET') {
    if (actionValue === 'export') return res.status(200).json(exportEntries());
    return res.status(200).json(getEntries());
  }

  if (req.method === 'POST') {
    if (actionValue === 'import') {
      const incoming = req.body?.entries;
      if (!Array.isArray(incoming)) return res.status(400).json({ error: 'entries array is required' });
      const imported = importEntries(incoming as KnowledgeEntry[]);
      return res.status(200).json(imported);
    }

    const { title, category, content, tags } = req.body as {
      title?: string;
      category?: KnowledgeCategory;
      content?: string;
      tags?: string[];
    };
    if (!title || !content || !isKnowledgeCategory(category)) {
      return res.status(400).json({ error: 'title, content, and valid category are required' });
    }
    const created = createEntry({ title, category, content, tags });
    return res.status(201).json(created);
  }

  if (req.method === 'PUT') {
    const { id, updates } = req.body as { id?: string; updates?: KnowledgeUpdateInput };
    if (!id || !updates) return res.status(400).json({ error: 'id and updates are required' });
    if (updates.category !== undefined && !isKnowledgeCategory(updates.category)) {
      return res.status(400).json({ error: 'invalid category' });
    }
    const updated = updateEntry(id, updates);
    if (!updated) return res.status(404).json({ error: 'entry not found' });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    const id = (req.query.id as string | undefined) ?? (req.body?.id as string | undefined);
    if (!id) return res.status(400).json({ error: 'id is required' });
    const ok = deleteEntry(id);
    if (!ok) return res.status(404).json({ error: 'entry not found' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

