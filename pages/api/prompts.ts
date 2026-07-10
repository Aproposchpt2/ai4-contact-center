import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createPrompt,
  deletePrompt,
  exportPrompts,
  getPrompts,
  importPrompts,
  updatePrompt,
  type PromptCategory,
  type PromptRecord,
  type PromptUpdateInput,
} from '@/lib/promptStore';

type ErrorResponse = { error: string };

const VALID_CATEGORIES: PromptCategory[] = ['builder', 'troubleshooter', 'designer', 'routing'];

function isPromptCategory(value: unknown): value is PromptCategory {
  return typeof value === 'string' && VALID_CATEGORIES.includes(value as PromptCategory);
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<PromptRecord[] | PromptRecord | { ok: boolean } | ErrorResponse>
) {
  const action = req.query.action;
  const actionValue = Array.isArray(action) ? action[0] : action;

  if (req.method === 'GET') {
    if (actionValue === 'export') return res.status(200).json(exportPrompts());
    return res.status(200).json(getPrompts());
  }

  if (req.method === 'POST') {
    if (actionValue === 'import') {
      const incoming = req.body?.prompts;
      if (!Array.isArray(incoming)) return res.status(400).json({ error: 'prompts array is required' });
      const imported = importPrompts(incoming as PromptRecord[]);
      return res.status(200).json(imported);
    }

    const { name, category, content, tags } = req.body as {
      name?: string;
      category?: PromptCategory;
      content?: string;
      tags?: string[];
    };
    if (!name || !content || !isPromptCategory(category)) {
      return res.status(400).json({ error: 'name, content, and valid category are required' });
    }
    const prompt = createPrompt({ name, category, content, tags });
    return res.status(201).json(prompt);
  }

  if (req.method === 'PUT') {
    const { id, updates } = req.body as { id?: string; updates?: PromptUpdateInput };
    if (!id || !updates) return res.status(400).json({ error: 'id and updates are required' });
    if (updates.category !== undefined && !isPromptCategory(updates.category)) {
      return res.status(400).json({ error: 'invalid category' });
    }
    const updated = updatePrompt(id, updates);
    if (!updated) return res.status(404).json({ error: 'prompt not found' });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    const id = (req.query.id as string | undefined) ?? (req.body?.id as string | undefined);
    if (!id) return res.status(400).json({ error: 'id is required' });
    const ok = deletePrompt(id);
    if (!ok) return res.status(404).json({ error: 'prompt not found' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

