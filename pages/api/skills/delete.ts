import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteSkill, type AgentSkillProfile, type SkillMapping } from '@/lib/agentSkillMatrixEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body as { agents: AgentSkillProfile[]; mappings: SkillMapping[]; skill: string };
    if (!body.skill) return res.status(400).json({ error: 'skill is required' });
    return res.status(200).json(deleteSkill(body));
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

