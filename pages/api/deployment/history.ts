import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

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

    const snapshots = (data ?? []).map((d: any) => ({
      id: d.id,
      environment: d.environment,
      versionId: d.flow_version_id,
      flow: d.snapshot?.definition ?? {},
      timestamp: d.deployed_at,
      metadata: {
        user: d.deployed_by ?? 'system',
        notes: d.snapshot?.notes ?? 'No notes',
        action: d.status === 'rolled_back' ? 'rollback' : 'deploy',
      },
      validation: d.snapshot?.validation ?? null,
      status: d.status,
      provider: d.provider,
    }));

    const currentByEnvironment: Record<string, string | null> = { dev: null, qa: null, staging: null, production: null };
    for (const snapshot of snapshots) {
      if (!currentByEnvironment[snapshot.environment] && snapshot.status === 'deployed') currentByEnvironment[snapshot.environment] = snapshot.id;
    }

    return res.status(200).json({ snapshots, currentByEnvironment });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
