import type { NextApiRequest, NextApiResponse } from 'next';
import { registerSystems, type IntegrationSystem } from '@/lib/integrationHubEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return res.status(200).json({ systems: registerSystems(req.body.systems as IntegrationSystem[]) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

