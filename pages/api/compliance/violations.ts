import type { NextApiRequest, NextApiResponse } from 'next';
import { runComplianceScan, type ComplianceScanInput } from '@/lib/complianceAutomationEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const violations = runComplianceScan(req.body as ComplianceScanInput);
    return res.status(200).json({ violations, total: violations.length });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

