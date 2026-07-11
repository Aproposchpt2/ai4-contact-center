import type { NextApiRequest, NextApiResponse } from 'next';
import { diffFlow } from '@/lib/flowRewriteEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body as { originalFlow: Record<string, unknown>; rewrittenFlow: Record<string, unknown> };
    return res.status(200).json({ diff: diffFlow(body.originalFlow, body.rewrittenFlow) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

