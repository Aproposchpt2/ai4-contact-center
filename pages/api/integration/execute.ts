import type { NextApiRequest, NextApiResponse } from 'next';
import { executeWorkflow, type IntegrationEvent, type IntegrationWorkflow } from '@/lib/integrationHubEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body as { workflow: IntegrationWorkflow; event: IntegrationEvent };
    return res.status(200).json({ execution: executeWorkflow(body.workflow, body.event) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

