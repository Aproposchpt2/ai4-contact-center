import type { NextApiRequest, NextApiResponse } from 'next';
import {
  saveIntent,
  type IntentNode,
  type IntentPriority,
  type IntentSLA,
  type RoutingMapping,
  type TaxonomyChannel,
} from '@/lib/intentTaxonomyEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse<IntentNode | { error: string }>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { id, name, parentId, description, examples, channels, priority, sla, routing } = req.body as {
    id?: string;
    name?: string;
    parentId?: string | null;
    description?: string;
    examples?: string[];
    channels?: TaxonomyChannel[];
    priority?: IntentPriority;
    sla?: Partial<IntentSLA>;
    routing?: Partial<RoutingMapping>;
  };

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  try {
    const intent = saveIntent({ id, name, parentId, description, examples, channels, priority, sla, routing });
    return res.status(200).json(intent);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
