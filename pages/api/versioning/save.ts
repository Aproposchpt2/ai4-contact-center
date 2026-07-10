import type { NextApiRequest, NextApiResponse } from 'next';
import { saveVersion, type FlowJson, type VersionRecord } from '@/lib/versioningEngine';

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<VersionRecord | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { flow, user, notes, branch } = req.body as {
    flow?: FlowJson;
    user?: string;
    notes?: string;
    branch?: string;
  };
  if (!flow || typeof flow !== 'object') {
    return res.status(400).json({ error: 'flow object is required' });
  }

  try {
    const version = saveVersion({ flow, user, notes, branch });
    return res.status(200).json(version);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

