import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';
import type { DeploymentDiffReport, EnvironmentName } from '@/lib/deploymentEngine';

type ErrorResponse = { error: string };
const ENVIRONMENTS: EnvironmentName[] = ['dev', 'qa', 'staging', 'production'];

function compareObjects(before: Record<string, unknown>, after: Record<string, unknown>) {
  const structuralDiff: DeploymentDiffReport['structuralDiff'] = [];
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  for (const key of allKeys) {
    const a = before[key];
    const b = after[key];
    const hasA = Object.prototype.hasOwnProperty.call(before, key);
    const hasB = Object.prototype.hasOwnProperty.call(after, key);
    if (!hasA && hasB) structuralDiff.push({ key, action: 'add', before: undefined, after: b });
    else if (hasA && !hasB) structuralDiff.push({ key, action: 'remove', before: a, after: undefined });
    else if (JSON.stringify(a) !== JSON.stringify(b)) structuralDiff.push({ key, action: 'update', before: a, after: b });
  }
  return structuralDiff;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<DeploymentDiffReport | ErrorResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { environmentA, environmentB } = req.body as {
    environmentA?: EnvironmentName;
    environmentB?: EnvironmentName;
  };
  if (!environmentA || !environmentB) {
    return res.status(400).json({ error: 'environmentA and environmentB are required' });
  }
  if (!ENVIRONMENTS.includes(environmentA) || !ENVIRONMENTS.includes(environmentB)) {
    return res.status(400).json({ error: 'Invalid environment' });
  }

  try {
    const { admin, tenantId } = await requireAi4ccContext(req);

    async function latest(environment: EnvironmentName) {
      const { data, error } = await admin
        .from('ai4cc_deployments')
        .select('id, snapshot, flow_version_id, deployed_at')
        .eq('tenant_id', tenantId)
        .eq('environment', environment)
        .eq('status', 'deployed')
        .order('deployed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    }

    const [a, b] = await Promise.all([latest(environmentA), latest(environmentB)]);
    if (!a || !b) {
      return res.status(400).json({ error: 'Both environments must have an active deployment before diffing' });
    }

    const flowA = (a.snapshot ?? {}) as Record<string, unknown>;
    const flowB = (b.snapshot ?? {}) as Record<string, unknown>;
    const structuralDiff = compareObjects(flowA, flowB);
    const logicDiff: string[] = [];
    const routingDiff: string[] = [];
    const recommendations: string[] = [];

    const optsA = Array.isArray(flowA.options) ? flowA.options.length : 0;
    const optsB = Array.isArray(flowB.options) ? flowB.options.length : 0;
    if (optsA !== optsB) logicDiff.push(`Options count changed: ${optsA} → ${optsB}`);
    if (JSON.stringify(flowA.after_hours) !== JSON.stringify(flowB.after_hours)) routingDiff.push('After-hours routing changed.');
    if (JSON.stringify(flowA.holiday) !== JSON.stringify(flowB.holiday)) routingDiff.push('Holiday routing changed.');
    if (structuralDiff.length > 8) recommendations.push('Large environment delta detected — run simulation before promotion.');
    if (routingDiff.length) recommendations.push('Review routing changes before promotion.');

    return res.status(200).json({ environmentA, environmentB, structuralDiff, logicDiff, routingDiff, recommendations });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
