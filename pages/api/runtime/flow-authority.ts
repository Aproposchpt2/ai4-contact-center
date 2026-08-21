import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';
import { resolveRuntimeFlowAuthority, runtimeEnvironment, type RuntimeChannel } from '@/lib/runtimeFlowDeployment';

const CHANNELS: RuntimeChannel[] = ['voice', 'sms', 'chat'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  try {
    const ctx = await requireAi4ccContext(req);
    const environment = runtimeEnvironment();
    const entries = await Promise.all(CHANNELS.map(async (channel) => {
      const authority = await resolveRuntimeFlowAuthority(ctx.admin, ctx.tenantId, channel, environment);
      return [channel, authority ? {
        versionId: authority.versionId,
        flowId: authority.flowId,
        flowName: authority.flowName,
        deploymentId: authority.deploymentId,
        authority: authority.authority,
        environment: authority.environment,
      } : null] as const;
    }));
    return res.status(200).json({ environment, channels: Object.fromEntries(entries) });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
