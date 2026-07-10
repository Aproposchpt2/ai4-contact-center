import type { NextApiRequest, NextApiResponse } from 'next';
import { diffVersions, type DiffReport } from '@/lib/versioningEngine';

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiffReport | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { fromVersionId, toVersionId } = req.body as {
    fromVersionId?: string;
    toVersionId?: string;
  };
  if (!fromVersionId || !toVersionId) {
    return res.status(400).json({ error: 'fromVersionId and toVersionId are required' });
  }

  try {
    const report = diffVersions(fromVersionId, toVersionId);
    return res.status(200).json(report);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

