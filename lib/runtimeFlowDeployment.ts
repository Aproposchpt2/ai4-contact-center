import type { SupabaseClient } from '@supabase/supabase-js';

export type RuntimeChannel = 'voice' | 'sms' | 'chat';
export type RuntimeEnvironment = 'dev' | 'qa' | 'staging' | 'production';

export type RuntimeFlowAuthority = {
  versionId: string;
  definition: Record<string, unknown> | null;
  flowId: string;
  flowName: string;
  channel: RuntimeChannel;
  environment: RuntimeEnvironment;
  deploymentId: string | null;
  authority: 'deployment' | 'development_fallback' | 'development_legacy_fallback';
};

function validEnvironment(value: string | undefined): RuntimeEnvironment {
  if (value === 'qa' || value === 'staging' || value === 'production') return value;
  return 'dev';
}

export function runtimeEnvironment(): RuntimeEnvironment {
  return validEnvironment(process.env.AI4CC_RUNTIME_ENVIRONMENT);
}

async function loadVersionForChannel(
  admin: SupabaseClient,
  tenantId: string,
  versionId: string,
  channel: RuntimeChannel,
) {
  const { data, error } = await admin
    .from('ai4cc_flow_versions')
    .select('id,flow_id,definition,ai4cc_flows!inner(id,tenant_id,name,channel)')
    .eq('id', versionId)
    .eq('ai4cc_flows.tenant_id', tenantId)
    .eq('ai4cc_flows.channel', channel)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

async function latestTenantVersion(admin: SupabaseClient, tenantId: string, channel?: RuntimeChannel) {
  let query = admin
    .from('ai4cc_flow_versions')
    .select('id,flow_id,definition,created_at,ai4cc_flows!inner(id,tenant_id,name,channel)')
    .eq('ai4cc_flows.tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (channel) query = query.eq('ai4cc_flows.channel', channel);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as any;
}

export async function resolveRuntimeFlowAuthority(
  admin: SupabaseClient,
  tenantId: string,
  channel: RuntimeChannel,
  environment: RuntimeEnvironment = runtimeEnvironment(),
): Promise<RuntimeFlowAuthority | null> {
  const { data: deployments, error: deploymentError } = await admin
    .from('ai4cc_deployments')
    .select('id,flow_version_id,deployed_at')
    .eq('tenant_id', tenantId)
    .eq('environment', environment)
    .eq('status', 'deployed')
    .order('deployed_at', { ascending: false })
    .limit(50);
  if (deploymentError) throw deploymentError;

  for (const deployment of deployments ?? []) {
    if (!deployment.flow_version_id) continue;
    const version = await loadVersionForChannel(admin, tenantId, deployment.flow_version_id, channel);
    if (!version) continue;
    const flow = version.ai4cc_flows as any;
    return {
      versionId: version.id,
      definition: (version.definition ?? null) as Record<string, unknown> | null,
      flowId: version.flow_id,
      flowName: flow?.name ?? 'Flow',
      channel,
      environment,
      deploymentId: deployment.id,
      authority: 'deployment',
    };
  }

  if (environment === 'production') return null;

  const channelFallback = await latestTenantVersion(admin, tenantId, channel);
  if (channelFallback) {
    const flow = channelFallback.ai4cc_flows as any;
    return {
      versionId: channelFallback.id,
      definition: (channelFallback.definition ?? null) as Record<string, unknown> | null,
      flowId: channelFallback.flow_id,
      flowName: flow?.name ?? 'Flow',
      channel,
      environment,
      deploymentId: null,
      authority: 'development_fallback',
    };
  }

  const legacyFallback = await latestTenantVersion(admin, tenantId);
  if (!legacyFallback) return null;
  const legacyFlow = legacyFallback.ai4cc_flows as any;
  return {
    versionId: legacyFallback.id,
    definition: (legacyFallback.definition ?? null) as Record<string, unknown> | null,
    flowId: legacyFallback.flow_id,
    flowName: legacyFlow?.name ?? 'Flow',
    channel,
    environment,
    deploymentId: null,
    authority: 'development_legacy_fallback',
  };
}
