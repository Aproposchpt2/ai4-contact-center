import type { NextApiRequest, NextApiResponse } from 'next';
import { buildReport, type AnalysisReport, type ScriptModel } from '@/lib/analyzer';

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalysisReport | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { script } = req.body as { script?: ScriptModel };
  if (!script || typeof script !== 'object') {
    return res.status(400).json({ error: 'script object is required' });
  }

  const report = buildReport(script);
  return res.status(200).json(report);
}

