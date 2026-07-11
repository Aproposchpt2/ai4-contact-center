import type { NextApiRequest, NextApiResponse } from 'next';
import { runComplianceScan, type ComplianceScanInput } from '@/lib/complianceAutomationEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return res.status(200).json({ violations: runComplianceScan(req.body as ComplianceScanInput) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

