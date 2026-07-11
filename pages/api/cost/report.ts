import type { NextApiRequest, NextApiResponse } from 'next';
import { generateCostReport, type CostInput } from '@/lib/costOptimizationEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return res.status(200).json({ report: generateCostReport(req.body as CostInput) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

