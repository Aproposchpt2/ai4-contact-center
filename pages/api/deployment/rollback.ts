import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

const VALID_ENVIRONMENTS = ['dev', 'qa', 'staging', 'production'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { environment, versionId, snapshotId } = req.body as { environment?: string; versionId?: string; snapshotId?: string };
  if (!environment || !VALID_ENVIRONMENTS.includes(environment)) return res.status(400).json({ error: 'valid environment is required' });
  if (!versionId) return res.status(400).json({ error: 'versionId is required for canonical rollback' });

  try {
    const ctx = await requireAi4ccContext(req);

    const { data: selectedVersion, error: selectedVersionError } = await ctx.admin
      .from('ai4cc_flow_versions')
      .select('id,flow_id,ai4cc_flows!inner(id,tenant_id,name,channel)')
      .eq('id', versionId)
      .eq('ai4cc_flows.tenant_id', ctx.tenantId)
      .maybeSingle();
    if (selectedVersionError) throw selectedVersionError;
    if (!selectedVersion) return res.status(404).json({ error: 'Version not found' });

    const flowRecord = selectedVersion.ai4cc_flows as any;
    const channel = flowRecord?.channel as string | undefined;

    const { data: flowVersions, error: flowVersionsError } = await ctx.admin
      .from('ai4cc_flow_versions')
      .select('id')
      .eq('flow_id', selectedVersion.flow_id);
    if (flowVersionsError) throw flowVersionsError;
    const flowVersionIds = (flowVersions ?? []).map((row: any) => row.id as string);
    if (flowVersionIds.length === 0) return res.status(404).json({ error: 'No versions found for selected flow' });

    const { data: history, error } = await ctx.admin
      .from('ai4cc_deployments')
      .select('id,flow_version_id,environment,status,provider,provider_reference,snapshot,deployed_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('environment', environment)
      .in('flow_version_id', flowVersionIds)
      .order('deployed_at', { ascending: false });
    if (error) throw error;
    if (!history || history.length < 1) return res.status(404).json({ error: `No deployment history found for ${channel ?? 'selected'} flow in environment` });

    const active = history.find((d: any) => d.status === 'deployed') ?? history[0];
    let target = snapshotId ? history.find((d: any) => d.id === snapshotId) : undefined;
    if (snapshotId && !target) return res.status(400).json({ error: 'Rollback snapshot does not belong to the selected canonical flow and environment' });
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
      payload: {
        channel: channel ?? null,
        flow_id: selectedVersion.flow_id,
        environment,
        from_deployment_id: active?.id ?? null,
        to_deployment_id: target.id,
        restored_flow_version_id: target.flow_version_id,
      },
    });

    return res.status(200).json({
      status: 'rolled_back',
      environment,
      channel: channel ?? null,
      activeSnapshotId: restored.id,
      rolledBackToSnapshotId: target.id,
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
