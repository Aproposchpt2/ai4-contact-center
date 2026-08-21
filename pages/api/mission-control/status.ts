import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';
import { derivePlatformStatus, missionControlModules } from '@/lib/missionControl';

const WINDOW_HOURS = 24;
const ENVIRONMENTS = ['dev', 'qa', 'staging', 'production'] as const;

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const ctx = await requireAi4ccContext(req);
    const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const [
      tenantResult,
      flowCountResult,
      versionCountResult,
      latestVersionResult,
      deploymentsResult,
      interactionsResult,
      complianceResult,
      auditResult,
    ] = await Promise.all([
      ctx.admin.from('ai4cc_tenants').select('id,name').eq('id', ctx.tenantId).single(),
      ctx.admin.from('ai4cc_flows').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId),
      ctx.admin.from('ai4cc_flow_versions').select('id,ai4cc_flows!inner(tenant_id)', { count: 'exact', head: true }).eq('ai4cc_flows.tenant_id', ctx.tenantId),
      ctx.admin.from('ai4cc_flow_versions').select('id,flow_id,version,validation_status,created_at,ai4cc_flows!inner(tenant_id,name)').eq('ai4cc_flows.tenant_id', ctx.tenantId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ctx.admin.from('ai4cc_deployments').select('id,flow_version_id,environment,status,provider,deployed_at').eq('tenant_id', ctx.tenantId).order('deployed_at', { ascending: false }).limit(200),
      ctx.admin.from('ai4cc_interactions').select('id,channel,status,started_at,ended_at').eq('tenant_id', ctx.tenantId).gte('started_at', since).order('started_at', { ascending: false }).limit(5000),
      ctx.admin.from('ai4cc_compliance_events').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).eq('status', 'open'),
      ctx.admin.from('ai4cc_audit_logs').select('id,action,resource_type,resource_id,created_at').eq('tenant_id', ctx.tenantId).order('created_at', { ascending: false }).limit(8),
    ]);

    if (tenantResult.error) throw tenantResult.error;
    if (flowCountResult.error) throw flowCountResult.error;
    if (versionCountResult.error) throw versionCountResult.error;
    if (latestVersionResult.error) throw latestVersionResult.error;
    if (deploymentsResult.error) throw deploymentsResult.error;
    if (interactionsResult.error) throw interactionsResult.error;
    if (complianceResult.error) throw complianceResult.error;
    if (auditResult.error) throw auditResult.error;

    const interactions = interactionsResult.data ?? [];
    const completed = interactions.filter((row: any) => row.status === 'completed');
    const active = interactions.filter((row: any) => row.status === 'active');
    const completedIds = completed.map((row: any) => row.id);

    const qaResult = completedIds.length
      ? await ctx.admin.from('ai4cc_qa_scores').select('interaction_id,quality_score,compliance_score').eq('tenant_id', ctx.tenantId).in('interaction_id', completedIds)
      : { data: [], error: null };
    if (qaResult.error) throw qaResult.error;

    const qaRows = qaResult.data ?? [];
    const qaInteractionIds = new Set(qaRows.map((row: any) => row.interaction_id));
    const qaCoveragePercent = completed.length ? (qaInteractionIds.size / completed.length) * 100 : null;

    const handleTimesSeconds = completed
      .filter((row: any) => row.started_at && row.ended_at)
      .map((row: any) => (new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 1000)
      .filter((value: number) => Number.isFinite(value) && value >= 0);

    const byChannel = interactions.reduce<Record<string, number>>((acc, row: any) => {
      const channel = String(row.channel || 'unknown');
      acc[channel] = (acc[channel] ?? 0) + 1;
      return acc;
    }, {});

    const deployments = deploymentsResult.data ?? [];
    const environmentState: Record<string, any> = {};
    for (const environment of ENVIRONMENTS) {
      const current = deployments.find((row: any) => row.environment === environment && row.status === 'deployed')
        ?? deployments.find((row: any) => row.environment === environment)
        ?? null;
      environmentState[environment] = current
        ? {
            deploymentId: current.id,
            versionId: current.flow_version_id,
            status: current.status,
            provider: current.provider,
            deployedAt: current.deployed_at,
          }
        : null;
    }

    const openComplianceFindings = complianceResult.count ?? 0;
    const latestVersion = latestVersionResult.data as any;
    const platformStatus = derivePlatformStatus({
      hasTenant: Boolean(tenantResult.data),
      hasFlowVersion: Boolean(latestVersion),
      deploymentReadable: true,
      runtimeReadable: true,
      openComplianceFindings,
    });

    return res.status(200).json({
      tenant: {
        id: ctx.tenantId,
        name: tenantResult.data?.name ?? 'AI4 Contact Center',
        role: ctx.role,
      },
      platform: {
        status: platformStatus,
        generatedAt: new Date().toISOString(),
        windowHours: WINDOW_HOURS,
      },
      flows: {
        total: flowCountResult.count ?? 0,
        versions: versionCountResult.count ?? 0,
        latestVersion: latestVersion
          ? {
              id: latestVersion.id,
              flowId: latestVersion.flow_id,
              flowName: latestVersion.ai4cc_flows?.name ?? 'Flow',
              version: latestVersion.version,
              validationStatus: latestVersion.validation_status,
              createdAt: latestVersion.created_at,
            }
          : null,
      },
      deployments: environmentState,
      runtime: {
        activeInteractions: active.length,
        completedInteractionsWindow: completed.length,
        byChannel: {
          voice: byChannel.voice ?? 0,
          sms: byChannel.sms ?? 0,
          chat: byChannel.chat ?? 0,
          simulation: byChannel.simulation ?? 0,
        },
        openComplianceFindings,
        recentAuditActivity: auditResult.data ?? [],
      },
      quality: {
        qaCoveragePercent: round(qaCoveragePercent),
        averageQualityScore: round(average(qaRows.map((row: any) => Number(row.quality_score)).filter(Number.isFinite))),
        averageComplianceScore: round(average(qaRows.map((row: any) => Number(row.compliance_score)).filter(Number.isFinite))),
      },
      metrics: {
        ahtSeconds: round(average(handleTimesSeconds)),
        containmentPercent: null,
        qaCoveragePercent: round(qaCoveragePercent),
        timeToDeploySeconds: null,
      },
      modules: missionControlModules,
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
