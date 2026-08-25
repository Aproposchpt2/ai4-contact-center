import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

function windowStart(windowKey: string) {
  const now = Date.now();
  const days = windowKey === '30d' ? 30 : windowKey === '24h' ? 1 : 7;
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const ctx = await requireAi4ccContext(req);
    const windowKey = typeof req.query.window === 'string' && ['24h', '7d', '30d'].includes(req.query.window) ? req.query.window : '7d';
    const environment = typeof req.query.environment === 'string' && ['production', 'all'].includes(req.query.environment) ? req.query.environment : 'production';
    const since = windowStart(windowKey);

    const { data: interactionRows, error: interactionError } = await ctx.admin
      .from('ai4cc_interactions')
      .select('id,status,started_at,ended_at,queue_id,agent_id,metadata')
      .eq('tenant_id', ctx.tenantId)
      .eq('channel', 'voice')
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(1000);
    if (interactionError) throw interactionError;

    const interactions = (interactionRows ?? []).filter((row: any) => {
      if (row.metadata?.source !== 'twilio_voice_webhook') return false;
      if (environment === 'all') return true;
      return row.metadata?.runtimeEnvironment === 'production';
    });

    const ids = interactions.map((row: any) => row.id);
    const queueIds = Array.from(new Set(interactions.map((row: any) => row.queue_id).filter(Boolean)));
    const agentIds = Array.from(new Set(interactions.map((row: any) => row.agent_id).filter(Boolean)));

    const [routingResult, qaResult, complianceResult, voicemailResult, queueResult, agentResult] = await Promise.all([
      ids.length ? ctx.admin.from('ai4cc_routing_decisions').select('interaction_id,intent,selected_queue_id,overflow_used,estimated_wait_seconds,decided_at').eq('tenant_id', ctx.tenantId).in('interaction_id', ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? ctx.admin.from('ai4cc_qa_scores').select('interaction_id,agent_id,quality_score,compliance_score,flow_adherence_score,sentiment_score,scored_at').eq('tenant_id', ctx.tenantId).in('interaction_id', ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? ctx.admin.from('ai4cc_compliance_events').select('interaction_id,severity,status,detected_at').eq('tenant_id', ctx.tenantId).in('interaction_id', ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? ctx.admin.from('ai4cc_voicemail_messages').select('interaction_id,callback_status,duration_seconds,received_at').eq('tenant_id', ctx.tenantId).in('interaction_id', ids) : Promise.resolve({ data: [], error: null }),
      queueIds.length ? ctx.admin.from('ai4cc_queues').select('id,name,code').eq('tenant_id', ctx.tenantId).in('id', queueIds as string[]) : Promise.resolve({ data: [], error: null }),
      agentIds.length ? ctx.admin.from('ai4cc_agents').select('id,name,status').eq('tenant_id', ctx.tenantId).in('id', agentIds as string[]) : Promise.resolve({ data: [], error: null }),
    ]);

    const relatedError = [routingResult.error, qaResult.error, complianceResult.error, voicemailResult.error, queueResult.error, agentResult.error].find(Boolean);
    if (relatedError) throw relatedError;

    const routes = routingResult.data ?? [];
    const qa = qaResult.data ?? [];
    const compliance = complianceResult.data ?? [];
    const voicemails = voicemailResult.data ?? [];
    const queues = queueResult.data ?? [];
    const agents = agentResult.data ?? [];
    const queueById = new Map(queues.map((row: any) => [row.id, row]));
    const agentById = new Map(agents.map((row: any) => [row.id, row]));

    const completed = interactions.filter((row: any) => row.status === 'completed');
    const abandoned = interactions.filter((row: any) => row.status === 'abandoned');
    const failed = interactions.filter((row: any) => row.status === 'failed');
    const active = interactions.filter((row: any) => row.status === 'active' || row.status === 'open' || row.status === 'queued');
    const afterHours = interactions.filter((row: any) => row.metadata?.temporalState === 'after_hours');
    const holiday = interactions.filter((row: any) => row.metadata?.temporalState === 'holiday');
    const speech = interactions.filter((row: any) => row.metadata?.capture === 'speech');
    const dtmf = interactions.filter((row: any) => row.metadata?.capture === 'dtmf');
    const voicemailCaptured = interactions.filter((row: any) => row.metadata?.capture === 'voicemail');

    const handleSeconds = completed
      .filter((row: any) => row.ended_at)
      .map((row: any) => Math.max(0, Math.round((new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 1000)));

    const intentCounts = new Map<string, number>();
    routes.forEach((row: any) => intentCounts.set(row.intent || 'unknown', (intentCounts.get(row.intent || 'unknown') ?? 0) + 1));

    const queueCounts = new Map<string, number>();
    interactions.forEach((row: any) => {
      const queue = row.queue_id ? queueById.get(row.queue_id) as any : null;
      const name = queue?.name ?? 'Unassigned';
      queueCounts.set(name, (queueCounts.get(name) ?? 0) + 1);
    });

    const agentCounts = new Map<string, number>();
    interactions.forEach((row: any) => {
      const agent = row.agent_id ? agentById.get(row.agent_id) as any : null;
      const name = agent?.name ?? 'Unassigned';
      agentCounts.set(name, (agentCounts.get(name) ?? 0) + 1);
    });

    const dayCounts = new Map<string, number>();
    interactions.forEach((row: any) => {
      const day = new Date(row.started_at).toISOString().slice(0, 10);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    });

    const waitValues = routes.map((row: any) => Number(row.estimated_wait_seconds)).filter((value: number) => Number.isFinite(value));
    const overflowCount = routes.filter((row: any) => row.overflow_used).length;
    const openCompliance = compliance.filter((row: any) => row.status !== 'resolved').length;
    const highSeverityCompliance = compliance.filter((row: any) => ['high', 'critical'].includes(String(row.severity).toLowerCase())).length;

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      window: windowKey,
      environment,
      source: 'canonical_ai4cc_voice_runtime',
      metrics: {
        totalCalls: interactions.length,
        completedCalls: completed.length,
        activeCalls: active.length,
        abandonedCalls: abandoned.length,
        failedCalls: failed.length,
        afterHoursCalls: afterHours.length,
        holidayCalls: holiday.length,
        voicemailCalls: voicemailCaptured.length,
        speechCalls: speech.length,
        dtmfCalls: dtmf.length,
        routedCalls: interactions.filter((row: any) => !!row.queue_id).length,
        agentAssignedCalls: interactions.filter((row: any) => !!row.agent_id).length,
        averageHandleSeconds: average(handleSeconds),
        averageEstimatedWaitSeconds: average(waitValues),
        overflowCount,
        voicemailOpenCallbacks: voicemails.filter((row: any) => row.callback_status !== 'resolved').length,
        averageQualityScore: average(qa.map((row: any) => Number(row.quality_score)).filter(Number.isFinite)),
        averageComplianceScore: average(qa.map((row: any) => Number(row.compliance_score)).filter(Number.isFinite)),
        averageFlowAdherenceScore: average(qa.map((row: any) => Number(row.flow_adherence_score)).filter(Number.isFinite)),
        openComplianceFindings: openCompliance,
        highSeverityComplianceFindings: highSeverityCompliance,
      },
      intents: Array.from(intentCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      queues: Array.from(queueCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      agents: Array.from(agentCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      dailyVolume: Array.from(dayCounts.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      recentCalls: interactions.slice(0, 12).map((row: any) => ({
        id: row.id,
        status: row.status,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        capture: row.metadata?.capture ?? null,
        temporalState: row.metadata?.temporalState ?? 'open_hours_or_unclassified',
        intent: routes.find((route: any) => route.interaction_id === row.id)?.intent ?? row.metadata?.routingIntent ?? row.metadata?.detectedIntent ?? null,
        queue: row.queue_id ? (queueById.get(row.queue_id) as any)?.name ?? null : null,
        agent: row.agent_id ? (agentById.get(row.agent_id) as any)?.name ?? null : null,
      })),
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
