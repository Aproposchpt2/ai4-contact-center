import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

type FlowJson = Record<string, unknown>;
type ErrorResponse = { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { flow, flowId, notes, name } = req.body as {
    flow?: FlowJson;
    flowId?: string;
    notes?: string;
    name?: string;
  };
  if (!flow || typeof flow !== 'object') return res.status(400).json({ error: 'flow object is required' });

  try {
    const ctx = await requireAi4ccContext(req);
    let canonicalFlowId = flowId;
    let nextVersion = 1;

    if (canonicalFlowId) {
      const { data: existing, error } = await ctx.admin
        .from('ai4cc_flows')
        .select('id,current_version')
        .eq('id', canonicalFlowId)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();
      if (error) throw error;
      if (!existing) return res.status(404).json({ error: 'Flow not found' });
      nextVersion = Number(existing.current_version || 0) + 1;
    } else {
      const { data: created, error } = await ctx.admin
        .from('ai4cc_flows')
        .insert({
          tenant_id: ctx.tenantId,
          name: name?.trim() || 'Versioned Flow',
          channel: 'voice',
          status: 'draft',
          current_version: 0,
          created_by: ctx.userId,
        })
        .select('id')
        .single();
      if (error || !created) throw error ?? new Error('Unable to create flow');
      canonicalFlowId = created.id;
    }

    const { data: version, error: versionError } = await ctx.admin
      .from('ai4cc_flow_versions')
      .insert({
        flow_id: canonicalFlowId,
        version: nextVersion,
        definition: flow,
        parser_engine: 'manual',
        validation_status: 'pending',
        notes: notes?.trim() || null,
        created_by: ctx.userId,
      })
      .select('id,flow_id,version,definition,notes,created_at,created_by')
      .single();
    if (versionError || !version) throw versionError ?? new Error('Unable to create version');

    await ctx.admin
      .from('ai4cc_flows')
      .update({ current_version: nextVersion, updated_at: new Date().toISOString() })
      .eq('id', canonicalFlowId)
      .eq('tenant_id', ctx.tenantId);

    await ctx.admin.from('ai4cc_audit_logs').insert({
      tenant_id: ctx.tenantId,
      actor_user_id: ctx.userId,
      action: 'flow.version_created',
      resource_type: 'flow_version',
      resource_id: version.id,
      payload: { flow_id: canonicalFlowId, version: nextVersion, notes: notes ?? null },
    });

    return res.status(200).json({
      id: version.id,
      flowId: version.flow_id,
      versionNumber: version.version,
      timestamp: version.created_at,
      user: version.created_by ?? 'system',
      notes: version.notes ?? 'No notes',
      branch: 'main',
      parentId: null,
      flow: version.definition,
      diffSummary: { addedKeys: [], removedKeys: [], changedKeys: [] },
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
