import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const ctx = await requireAi4ccContext(req);
    const { data, error } = await ctx.admin
      .from('ai4cc_flow_versions')
      .select('id,flow_id,version,definition,notes,created_at,created_by,validation_status,ai4cc_flows!inner(tenant_id,name)')
      .eq('ai4cc_flows.tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const versions = (data ?? []).map((v: any) => ({
      id: v.id,
      flowId: v.flow_id,
      flowName: v.ai4cc_flows?.name ?? 'Flow',
      versionNumber: v.version,
      timestamp: v.created_at,
      user: v.created_by ?? 'system',
      notes: v.notes ?? 'No notes',
      branch: 'main',
      parentId: null,
      flow: v.definition,
      validationStatus: v.validation_status,
      diffSummary: { addedKeys: [], removedKeys: [], changedKeys: [] },
    }));

    const { data: audits } = await ctx.admin
      .from('ai4cc_audit_logs')
      .select('id,created_at,action,payload')
      .eq('tenant_id', ctx.tenantId)
      .in('action', ['flow.version_created', 'flow.version_rollback'])
      .order('created_at', { ascending: false })
      .limit(100);

    return res.status(200).json({
      versions,
      branches: [{ name: 'main', headVersionId: versions[0]?.id ?? null, baseVersionId: versions.at(-1)?.id ?? null, createdAt: versions.at(-1)?.timestamp ?? new Date().toISOString(), createdFromBranch: null }],
      auditLog: (audits ?? []).map((a: any) => ({ id: a.id, timestamp: a.created_at, type: a.action === 'flow.version_rollback' ? 'rollback' : 'version_created', message: a.action, metadata: a.payload })),
      currentVersionId: versions[0]?.id ?? null,
      currentBranch: 'main',
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
