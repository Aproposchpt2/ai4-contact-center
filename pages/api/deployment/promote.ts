import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';
import { validateFlow, type EnvironmentName, type ValidationReport } from '@/lib/deploymentEngine';

type PromotionResponse = {
  status: 'promoted';
  fromEnvironment: EnvironmentName;
  toEnvironment: EnvironmentName;
  snapshot: {
    id: string;
    environment: EnvironmentName;
    versionId: string;
    flow: Record<string, unknown>;
    timestamp: string;
    metadata: { user: string; notes: string; action: 'promote'; sourceEnvironment: EnvironmentName };
    validation: ValidationReport;
  };
  validation: ValidationReport;
};

type ErrorResponse = { error: string };
const ENVIRONMENTS: EnvironmentName[] = ['dev', 'qa', 'staging', 'production'];

export default async function handler(req: NextApiRequest, res: NextApiResponse<PromotionResponse | ErrorResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { fromEnvironment, toEnvironment, notes } = req.body as {
    fromEnvironment?: EnvironmentName;
    toEnvironment?: EnvironmentName;
    notes?: string;
  };
  if (!fromEnvironment || !toEnvironment) {
    return res.status(400).json({ error: 'fromEnvironment and toEnvironment are required' });
  }
  if (!ENVIRONMENTS.includes(fromEnvironment) || !ENVIRONMENTS.includes(toEnvironment)) {
    return res.status(400).json({ error: 'Invalid environment' });
  }
  if (fromEnvironment === toEnvironment) {
    return res.status(400).json({ error: 'Source and target environments must differ' });
  }

  try {
    const { admin, userId, tenantId } = await requireAi4ccContext(req);

    const { data: source, error: sourceError } = await admin
      .from('ai4cc_deployments')
      .select('id, flow_version_id, snapshot, deployed_at')
      .eq('tenant_id', tenantId)
      .eq('environment', fromEnvironment)
      .eq('status', 'deployed')
      .order('deployed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!source) return res.status(400).json({ error: `No deployed snapshot exists in ${fromEnvironment}` });

    const flow = (source.snapshot ?? {}) as Record<string, unknown>;
    const validation = validateFlow({ flow });
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed during promotion' });
    }

    const timestamp = new Date().toISOString();
    const promotionNotes = notes?.trim() || `Promoted from ${fromEnvironment}`;
    const providerReference = `canonical:${source.flow_version_id}`;

    const { data: inserted, error: insertError } = await admin
      .from('ai4cc_deployments')
      .insert({
        tenant_id: tenantId,
        flow_version_id: source.flow_version_id,
        environment: toEnvironment,
        status: 'deployed',
        provider: 'ai4cc-canonical',
        provider_reference: providerReference,
        snapshot: flow,
        deployed_by: userId,
        deployed_at: timestamp,
      })
      .select('id, deployed_at')
      .single();

    if (insertError || !inserted) throw insertError ?? new Error('Unable to create promoted deployment');

    await admin.from('ai4cc_audit_logs').insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: 'deployment.promoted',
      resource_type: 'deployment',
      resource_id: inserted.id,
      payload: {
        from_environment: fromEnvironment,
        to_environment: toEnvironment,
        source_deployment_id: source.id,
        flow_version_id: source.flow_version_id,
        notes: promotionNotes,
      },
    });

    return res.status(200).json({
      status: 'promoted',
      fromEnvironment,
      toEnvironment,
      snapshot: {
        id: inserted.id,
        environment: toEnvironment,
        versionId: source.flow_version_id,
        flow,
        timestamp: inserted.deployed_at,
        metadata: {
          user: userId,
          notes: promotionNotes,
          action: 'promote',
          sourceEnvironment: fromEnvironment,
        },
        validation,
      },
      validation,
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
