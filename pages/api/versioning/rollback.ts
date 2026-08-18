import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

type ErrorResponse = { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { versionId } = req.body as { versionId?: string };
  if (!versionId) return res.status(400).json({ error: 'versionId is required' });

  try {
    const ctx = await requireAi4ccContext(req);
    const { data: target, error } = await ctx.admin
      .from('ai4cc_flow_versions')
      .select('id,flow_id,version,definition,parser_engine,validation_status,validation_report,ai4cc_flows!inner(tenant_id,current_version)')
      .eq('id', versionId)
      .eq('ai4cc_flows.tenant_id', ctx.tenantId)
      .maybeSingle();
    if (error) throw error;
    if (!target) return res.status(404).json({ error: 'Version not found' });

    const currentVersion = Number((target.ai4cc_flows as any)?.current_version || 0);
    const nextVersion = currentVersion + 1;
    const { data: restored, error: insertError } = await ctx.admin
      .from('ai4cc_flow_versions')
      .insert({
        flow_id: target.flow_id,
        version: nextVersion,
        definition: target.definition,
        parser_engine: target.parser_engine,
        validation_status: target.validation_status,
        validation_report: target.validation_report,
        notes: `Rollback snapshot from v${target.version}`,
        created_by: ctx.userId,
      })
      .select('id,version')
      .single();
    if (insertError || !restored) throw insertError ?? new Error('Unable to create rollback version');

    await ctx.admin
      .from('ai4cc_flows')
      .update({ current_version: nextVersion, updated_at: new Date().toISOString() })
      .eq('id', target.flow_id)
      .eq('tenant_id', ctx.tenantId);

    await ctx.admin.from('ai4cc_audit_logs').insert({
      tenant_id: ctx.tenantId,
      actor_user_id: ctx.userId,
      action: 'flow.version_rollback',
      resource_type: 'flow_version',
      resource_id: restored.id,
      payload: { flow_id: target.flow_id, restored_from_version_id: target.id, restored_from_version: target.version, new_version: nextVersion },
    });

    return res.status(200).json({ ok: true, versionId: restored.id, branch: 'main', versionNumber: restored.version });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
