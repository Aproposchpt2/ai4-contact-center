import type { NextApiRequest, NextApiResponse } from 'next';
import { routeEvents, type IntegrationEvent, type IntegrationSystem } from '@/lib/integrationHubEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body as { events: IntegrationEvent[]; systems: IntegrationSystem[] };
    return res.status(200).json({ routes: routeEvents(body.events, body.systems) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

