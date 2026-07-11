import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteIntent } from '@/lib/intentTaxonomyEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { id, force } = req.body as { id?: string; force?: boolean };
  if (!id) return res.status(400).json({ error: 'id is required' });

  try {
    const result = deleteIntent(id, force ?? false);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
