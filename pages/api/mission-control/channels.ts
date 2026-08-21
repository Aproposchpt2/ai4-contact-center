import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';
import { deriveChannelStatus } from '@/lib/missionControl';

type BackendHealth = {
  ok?: boolean;
  service?: string;
  signatureValidation?: boolean;
  tenant?: string;
  queueReady?: boolean;
  agentReady?: boolean;
  flowVersionReady?: boolean;
  runtimeRouting?: boolean;
  error?: string;
};

async function fetchHealth(url: string): Promise<{ reachable: boolean; details: BackendHealth }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' } });
    const details = await response.json().catch(() => ({})) as BackendHealth;
    return { reachable: response.ok, details: { ...details, ok: response.ok && details.ok !== false } };
  } catch (error) {
    return { reachable: false, details: { ok: false, error: error instanceof Error ? error.message : 'Health request failed' } };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const ctx = await requireAi4ccContext(req);
    const backendBase = (process.env.AI4CC_BACKEND_URL ?? 'https://api.aproposgroupllc.com').replace(/\/$/, '');

    const [voice, sms, tenantResult, queuesResult, agentsResult, versionResult] = await Promise.all([
      fetchHealth(`${backendBase}/webhooks/twilio/voice/health`),
      fetchHealth(`${backendBase}/webhooks/twilio/messaging/health`),
      ctx.admin.from('ai4cc_tenants').select('id,name').eq('id', ctx.tenantId).single(),
      ctx.admin.from('ai4cc_queues').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).eq('status', 'active'),
      ctx.admin.from('ai4cc_agents').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).eq('status', 'available'),
      ctx.admin.from('ai4cc_flow_versions').select('id,ai4cc_flows!inner(tenant_id)').eq('ai4cc_flows.tenant_id', ctx.tenantId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (tenantResult.error) throw tenantResult.error;
    if (queuesResult.error) throw queuesResult.error;
    if (agentsResult.error) throw agentsResult.error;
    if (versionResult.error) throw versionResult.error;

    const chatDetails = {
      ok: true,
      service: 'ai4cc-web-chat',
      tenant: tenantResult.data?.name ?? 'AI4 Contact Center',
      queueReady: (queuesResult.count ?? 0) > 0,
      agentReady: (agentsResult.count ?? 0) > 0,
      flowVersionReady: Boolean(versionResult.data),
      runtimeRouting: true,
    };

    const channel = (result: { reachable: boolean; details: BackendHealth }) => ({
      status: deriveChannelStatus({
        reachable: result.reachable,
        ok: result.details.ok,
        queueReady: result.details.queueReady,
        flowVersionReady: result.details.flowVersionReady,
        runtimeRouting: result.details.runtimeRouting,
      }),
      details: {
        service: result.details.service ?? null,
        signatureValidation: result.details.signatureValidation ?? null,
        tenant: result.details.tenant ?? null,
        queueReady: result.details.queueReady ?? false,
        agentReady: result.details.agentReady ?? false,
        flowVersionReady: result.details.flowVersionReady ?? false,
        runtimeRouting: result.details.runtimeRouting ?? false,
        error: result.details.error ?? null,
      },
    });

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      voice: channel(voice),
      sms: channel(sms),
      chat: {
        status: deriveChannelStatus({
          reachable: true,
          ok: chatDetails.ok,
          queueReady: chatDetails.queueReady,
          flowVersionReady: chatDetails.flowVersionReady,
          runtimeRouting: chatDetails.runtimeRouting,
        }),
        details: chatDetails,
      },
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
