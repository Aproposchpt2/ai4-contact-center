import type { NextApiRequest, NextApiResponse } from 'next';
import { runSimulation, type FlowScript, type SimulationConfig, type SimulationReport } from '@/lib/simulationEngine';

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SimulationReport | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { script, config } = req.body as {
    script?: FlowScript;
    config?: Partial<SimulationConfig>;
  };

  if (!script || typeof script !== 'object') {
    return res.status(400).json({ error: 'script object is required' });
  }

  const report = runSimulation(script, config ?? {});
  return res.status(200).json(report);
}

