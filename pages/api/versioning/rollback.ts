import type { NextApiRequest, NextApiResponse } from 'next';
import { rollbackVersion } from '@/lib/versioningEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<{ ok: boolean; versionId: string; branch: string; versionNumber: number } | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { versionId } = req.body as { versionId?: string };
  if (!versionId) {
    return res.status(400).json({ error: 'versionId is required' });
  }

  try {
    const result = rollbackVersion(versionId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

