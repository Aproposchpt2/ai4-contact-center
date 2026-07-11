import type { NextApiRequest, NextApiResponse } from 'next';
import { explainRewrite, type RewriteResult } from '@/lib/flowRewriteEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return res.status(200).json(explainRewrite(req.body as RewriteResult));
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

