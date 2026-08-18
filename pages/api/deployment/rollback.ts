import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

const VALID_ENVIRONMENTS = ['dev', 'qa', 'staging', 'production'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { environment, snapshotId } = req.body as { environment?: string; snapshotId?: string };
  if (!environment || !VALID_ENVIRONMENTS.includes(environment)) return res.status(400).json({ error: 'valid environment is required' });

  try {
    const ctx = await requireAi4ccContext(req);
    const { data: history, error } = await ctx.admin
      .from('ai4cc_deployments')
      .select('id,flow_version_id,environment,status,provider,provider_reference,snapshot,deployed_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('environment', environment)
      .order('deployed_at', { ascending: false });
    if (error) throw error;
    if (!history || history.length < 1) return res.status(404).json({ error: 'No deployment history found for environment' });

    const active = history.find((d: any) => d.status === 'deployed') ?? history[0];
    let target = snapshotId ? history.find((d: any) => d.id === snapshotId) : undefined;
    if (!target) target = history.find((d: any) => d.id !== active.id && d.status !== 'failed');
    if (!target) return res.status(409).json({ error: 'No prior deployment is available for rollback' });

    if (active?.id) {
      const { error: activeUpdateError } = await ctx.admin
        .from('ai4cc_deployments')
        .update({ status: 'rolled_back' })
        .eq('id', active.id)
        .eq('tenant_id', ctx.tenantId);
      if (activeUpdateError) throw activeUpdateError;
    }

    const rollbackSnapshot = {
      ...(target.snapshot ?? {}),
      rollback_from_deployment_id: active?.id ?? null,
      rollback_to_deployment_id: target.id,
    };

    const { data: restored, error: restoreError } = await ctx.admin
      .from('ai4cc_deployments')
      .insert({
        tenant_id: ctx.tenantId,
        flow_version_id: target.flow_version_id,
        environment,
        status: 'deployed',
        provider: target.provider || 'ai4cc-native',
        provider_reference: target.provider_reference,
        snapshot: rollbackSnapshot,
        deployed_by: ctx.userId,
      })
      .select('id,deployed_at')
      .single();
    if (restoreError || !restored) throw restoreError ?? new Error('Unable to create rollback deployment');

    await ctx.admin.from('ai4cc_audit_logs').insert({
      tenant_id: ctx.tenantId,
      actor_user_id: ctx.userId,
      action: 'deployment.rolled_back',
      resource_type: 'deployment',
      resource_id: restored.id,
      payload: { environment, from_deployment_id: active?.id ?? null, to_deployment_id: target.id, restored_flow_version_id: target.flow_version_id },
    });

    return res.status(200).json({
      status: 'rolled_back',
      environment,
      activeSnapshotId: restored.id,
      rolledBackToSnapshotId: target.id,
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
