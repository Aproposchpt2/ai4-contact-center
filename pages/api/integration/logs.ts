import type { NextApiRequest, NextApiResponse } from 'next';
import { integrationLogs, type IntegrationEvent } from '@/lib/integrationHubEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body as { events: IntegrationEvent[] };
    return res.status(200).json({ logs: integrationLogs(body.events) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

