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
  authority: 'deployment' | 'development_fallback';
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

  const { data: fallback, error: fallbackError } = await admin
    .from('ai4cc_flow_versions')
    .select('id,flow_id,definition,created_at,ai4cc_flows!inner(id,tenant_id,name,channel)')
    .eq('ai4cc_flows.tenant_id', tenantId)
    .eq('ai4cc_flows.channel', channel)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fallbackError) throw fallbackError;
  if (!fallback) return null;

  const flow = fallback.ai4cc_flows as any;
  return {
    versionId: fallback.id,
    definition: (fallback.definition ?? null) as Record<string, unknown> | null,
    flowId: fallback.flow_id,
    flowName: flow?.name ?? 'Flow',
    channel,
    environment,
    deploymentId: null,
    authority: 'development_fallback',
  };
}
