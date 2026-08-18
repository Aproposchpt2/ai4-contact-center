import type { NextApiRequest, NextApiResponse } from 'next';
import { validateFlow, type EnvironmentName } from '@/lib/deploymentEngine';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

type ErrorResponse = { error: string };
const ENVIRONMENTS: EnvironmentName[] = ['dev', 'qa', 'staging', 'production'];

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { environment, versionId, notes } = req.body as { environment?: EnvironmentName; versionId?: string; notes?: string };
  if (!environment || !ENVIRONMENTS.includes(environment)) return res.status(400).json({ error: 'valid environment is required' });
  if (!versionId) return res.status(400).json({ error: 'versionId is required for canonical deployment' });

  try {
    const ctx = await requireAi4ccContext(req);
    const { data: version, error } = await ctx.admin
      .from('ai4cc_flow_versions')
      .select('id,flow_id,version,definition,validation_status,validation_report,ai4cc_flows!inner(tenant_id,name)')
      .eq('id', versionId)
      .eq('ai4cc_flows.tenant_id', ctx.tenantId)
      .maybeSingle();
    if (error) throw error;
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const validation = validateFlow({ flow: version.definition });
    if (!validation.isValid) {
      await ctx.admin.from('ai4cc_flow_versions').update({ validation_status: 'failed', validation_report: validation }).eq('id', versionId);
      return res.status(409).json({ error: 'Flow validation failed. Deployment blocked.', validation });
    }

    const validationStatus = validation.warnings.length ? 'warning' : 'passed';
    await ctx.admin.from('ai4cc_flow_versions').update({ validation_status: validationStatus, validation_report: validation }).eq('id', versionId);

    const snapshot = {
      flow_id: version.flow_id,
      flow_name: (version.ai4cc_flows as any)?.name ?? 'Flow',
      version: version.version,
      definition: version.definition,
      validation,
      notes: notes?.trim() || null,
    };

    const { data: deployment, error: deploymentError } = await ctx.admin
      .from('ai4cc_deployments')
      .insert({
        tenant_id: ctx.tenantId,
        flow_version_id: versionId,
        environment,
        status: 'deployed',
        provider: 'ai4cc-native',
        snapshot,
        deployed_by: ctx.userId,
      })
      .select('id,environment,status,provider,snapshot,deployed_at')
      .single();
    if (deploymentError || !deployment) throw deploymentError ?? new Error('Unable to create deployment');

    await ctx.admin.from('ai4cc_audit_logs').insert({
      tenant_id: ctx.tenantId,
      actor_user_id: ctx.userId,
      action: 'flow.deployed',
      resource_type: 'deployment',
      resource_id: deployment.id,
      payload: { flow_version_id: versionId, flow_id: version.flow_id, environment, provider: 'ai4cc-native' },
    });

    return res.status(200).json({
      status: 'deployed',
      environment,
      snapshot: {
        id: deployment.id,
        environment: deployment.environment,
        versionId,
        flow: version.definition,
        timestamp: deployment.deployed_at,
        metadata: { user: ctx.userId, notes: notes?.trim() || 'No notes', action: 'deploy' },
        validation,
      },
      validation,
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
