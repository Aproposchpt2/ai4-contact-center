import type { NextApiRequest, NextApiResponse } from 'next';
import { exportTaxonomy } from '@/lib/intentTaxonomyEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  try {
    return res.status(200).json(exportTaxonomy());
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
