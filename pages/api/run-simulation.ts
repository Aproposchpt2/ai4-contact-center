import type { NextApiRequest, NextApiResponse } from 'next';
import { runSimulation, type FlowScript, type SimulationConfig, type SimulationReport } from '@/lib/simulationEngine';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

type ErrorResponse = { error: string };

type SimulationResponse = SimulationReport & {
  canonical?: { versionId: string; flowId: string; version: number; flowName: string };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SimulationResponse | ErrorResponse>
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { script, versionId, config } = req.body as {
    script?: FlowScript;
    versionId?: string;
    config?: Partial<SimulationConfig>;
  };

  if (!script && !versionId) {
    return res.status(400).json({ error: 'script object or versionId is required' });
  }

  try {
    if (versionId) {
      const { admin, tenantId, userId } = await requireAi4ccContext(req);
      const { data: version, error } = await admin
        .from('ai4cc_flow_versions')
        .select('id,flow_id,version,definition,ai4cc_flows!inner(tenant_id,name)')
        .eq('id', versionId)
        .eq('ai4cc_flows.tenant_id', tenantId)
        .single();
      if (error || !version) return res.status(404).json({ error: 'Flow version not found' });

      const report = runSimulation(version.definition as FlowScript, config ?? {});
      await admin.from('ai4cc_audit_logs').insert({
        tenant_id: tenantId,
        actor_user_id: userId,
        action: 'flow.simulated',
        resource_type: 'flow_version',
        resource_id: version.id,
        payload: { flow_id: version.flow_id, version: version.version, config: config ?? {} },
      });

      return res.status(200).json({
        ...report,
        canonical: {
          versionId: version.id,
          flowId: version.flow_id,
          version: version.version,
          flowName: (version.ai4cc_flows as any)?.name ?? 'Flow',
        },
      });
    }

    if (!script || typeof script !== 'object') {
      return res.status(400).json({ error: 'script object is required' });
    }
    return res.status(200).json(runSimulation(script, config ?? {}));
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
