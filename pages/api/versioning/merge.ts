import type { NextApiRequest, NextApiResponse } from 'next';
import { mergeBranch, type MergeReport } from '@/lib/versioningEngine';

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<MergeReport | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { sourceBranch, targetBranch } = req.body as {
    sourceBranch?: string;
    targetBranch?: string;
  };
  if (!sourceBranch) {
    return res.status(400).json({ error: 'sourceBranch is required' });
  }

  try {
    const report = mergeBranch(sourceBranch, targetBranch ?? 'main');
    return res.status(200).json(report);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

