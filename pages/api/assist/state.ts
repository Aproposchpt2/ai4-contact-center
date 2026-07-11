import type { NextApiRequest, NextApiResponse } from 'next';
import { getAssistState, type AssistSession } from '@/lib/agentAssistEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return res.status(200).json({ state: getAssistState(req.body as AssistSession) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

