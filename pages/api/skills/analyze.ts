import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeSkillCoverage, type AgentSkillProfile, type SkillMapping, type SkillDemand } from '@/lib/agentSkillMatrixEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body as { agents: AgentSkillProfile[]; mappings: SkillMapping[]; demand: SkillDemand[] };
    return res.status(200).json(analyzeSkillCoverage(body));
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

