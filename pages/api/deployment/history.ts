import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

const ENV_NAMES = ['dev', 'qa', 'staging', 'production'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const environment = typeof req.query.environment === 'string' ? req.query.environment : undefined;

  try {
    const ctx = await requireAi4ccContext(req);
    let query = ctx.admin
      .from('ai4cc_deployments')
      .select('id,flow_version_id,environment,status,provider,provider_reference,snapshot,deployed_by,deployed_at')
      .eq('tenant_id', ctx.tenantId)
      .order('deployed_at', { ascending: false });
    if (environment) query = query.eq('environment', environment);
    const { data, error } = await query;
    if (error) throw error;

    const history = (data ?? []).map((d: any) => ({
      id: d.id,
      environment: d.environment,
      versionId: d.flow_version_id,
      flow: d.snapshot?.definition ?? {},
      timestamp: d.deployed_at,
      metadata: {
        user: d.deployed_by ?? 'system',
        notes: d.snapshot?.notes ?? 'No notes',
        action: d.snapshot?.rollback_to_deployment_id ? 'rollback' : 'deploy',
      },
      validation: d.snapshot?.validation ?? { isValid: true, structural: [], logic: [], routing: [], bestPractice: [], warnings: [], errors: [], recommendations: [] },
      status: d.status,
      provider: d.provider,
    }));

    const environments: Record<string, any> = {};
    for (const name of ENV_NAMES) {
      const envHistory = history.filter((h: any) => h.environment === name);
      const active = envHistory.find((h: any) => h.status === 'deployed') ?? null;
      environments[name] = {
        name,
        currentSnapshotId: active?.id ?? null,
        historySnapshotIds: envHistory.map((h: any) => h.id),
        locked: false,
      };
    }

    const { data: audits } = await ctx.admin
      .from('ai4cc_audit_logs')
      .select('id,created_at,action,payload')
      .eq('tenant_id', ctx.tenantId)
      .in('action', ['flow.deployed', 'deployment.rolled_back'])
      .order('created_at', { ascending: false })
      .limit(100);

    const auditLog = (audits ?? []).map((a: any) => ({
      id: a.id,
      timestamp: a.created_at,
      type: a.action === 'deployment.rolled_back' ? 'rollback' : 'deployment',
      message: a.action,
      metadata: a.payload,
    }));

    return res.status(200).json({ environments, history, auditLog });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
