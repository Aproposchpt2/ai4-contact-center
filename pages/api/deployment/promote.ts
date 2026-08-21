import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';
import { validateFlow, type EnvironmentName, type ValidationReport } from '@/lib/deploymentEngine';

type RuntimeChannel = 'voice' | 'sms' | 'chat';

type PromotionResponse = {
  status: 'promoted';
  fromEnvironment: EnvironmentName;
  toEnvironment: EnvironmentName;
  channel: RuntimeChannel;
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
const CHANNELS: RuntimeChannel[] = ['voice', 'sms', 'chat'];

export default async function handler(req: NextApiRequest, res: NextApiResponse<PromotionResponse | ErrorResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { fromEnvironment, toEnvironment, channel, notes } = req.body as {
    fromEnvironment?: EnvironmentName;
    toEnvironment?: EnvironmentName;
    channel?: RuntimeChannel;
    notes?: string;
  };
  if (!fromEnvironment || !toEnvironment || !channel) {
    return res.status(400).json({ error: 'fromEnvironment, toEnvironment, and channel are required' });
  }
  if (!ENVIRONMENTS.includes(fromEnvironment) || !ENVIRONMENTS.includes(toEnvironment)) {
    return res.status(400).json({ error: 'Invalid environment' });
  }
  if (!CHANNELS.includes(channel)) {
    return res.status(400).json({ error: 'Invalid channel' });
  }
  if (fromEnvironment === toEnvironment) {
    return res.status(400).json({ error: 'Source and target environments must differ' });
  }

  try {
    const { admin, userId, tenantId } = await requireAi4ccContext(req);

    const { data: candidates, error: sourceError } = await admin
      .from('ai4cc_deployments')
      .select('id,flow_version_id,snapshot,deployed_at')
      .eq('tenant_id', tenantId)
      .eq('environment', fromEnvironment)
      .eq('status', 'deployed')
      .order('deployed_at', { ascending: false })
      .limit(100);

    if (sourceError) throw sourceError;

    let source: any = null;
    let sourceVersion: any = null;
    for (const candidate of candidates ?? []) {
      if (!candidate.flow_version_id) continue;
      const { data: version, error: versionError } = await admin
        .from('ai4cc_flow_versions')
        .select('id,flow_id,version,definition,validation_status,validation_report,ai4cc_flows!inner(id,tenant_id,name,channel)')
        .eq('id', candidate.flow_version_id)
        .eq('ai4cc_flows.tenant_id', tenantId)
        .eq('ai4cc_flows.channel', channel)
        .maybeSingle();
      if (versionError) throw versionError;
      if (!version) continue;
      source = candidate;
      sourceVersion = version;
      break;
    }

    if (!source || !sourceVersion) {
      return res.status(400).json({ error: `No deployed ${channel} snapshot exists in ${fromEnvironment}` });
    }

    const flowDefinition = (sourceVersion.definition ?? {}) as Record<string, unknown>;
    const validation = validateFlow({ flow: flowDefinition });
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed during promotion' });
    }

    const timestamp = new Date().toISOString();
    const promotionNotes = notes?.trim() || `Promoted ${channel} from ${fromEnvironment}`;
    const providerReference = `canonical:${source.flow_version_id}`;
    const flowRecord = sourceVersion.ai4cc_flows as any;
    const sourceSnapshot = source.snapshot && typeof source.snapshot === 'object'
      ? source.snapshot
      : {
          flow_id: sourceVersion.flow_id,
          flow_name: flowRecord?.name ?? 'Flow',
          version: sourceVersion.version,
          definition: flowDefinition,
          validation,
          notes: promotionNotes,
        };

    const { data: inserted, error: insertError } = await admin
      .from('ai4cc_deployments')
      .insert({
        tenant_id: tenantId,
        flow_version_id: source.flow_version_id,
        environment: toEnvironment,
        status: 'deployed',
        provider: 'ai4cc-canonical',
        provider_reference: providerReference,
        snapshot: sourceSnapshot,
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
        channel,
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
      channel,
      snapshot: {
        id: inserted.id,
        environment: toEnvironment,
        versionId: source.flow_version_id,
        flow: flowDefinition,
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
