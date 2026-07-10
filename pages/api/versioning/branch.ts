import type { NextApiRequest, NextApiResponse } from 'next';
import { createBranch, switchBranch } from '@/lib/versioningEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<object | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { action, name, fromVersionId } = req.body as {
    action?: 'create' | 'switch';
    name?: string;
    fromVersionId?: string;
  };
  if (!action || !name) {
    return res.status(400).json({ error: 'action and name are required' });
  }

  try {
    if (action === 'create') {
      const branch = createBranch(name, fromVersionId);
      return res.status(200).json(branch);
    }
    const switched = switchBranch(name);
    return res.status(200).json(switched);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

