import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateGuidance, type AssistSession } from '@/lib/agentAssistEngine';
import { generateQAReport } from '@/lib/qualityAssuranceEngine';
import { selectRuntimeRoute } from '@/lib/runtimeRouting';

type ChatBody = { action?: 'message' | 'end'; sessionId?: string; visitorId?: string; message?: string };

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Canonical Supabase storage is not configured');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function validateOrigin(req: NextApiRequest) {
  if (process.env.NODE_ENV !== 'production') return;
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host || new URL(origin).host !== host) throw new Error('Invalid web chat origin');
}

function validSessionId(value: string) { return /^[A-Za-z0-9_-]{8,80}$/.test(value); }
function sentimentValue(sentiment: 'negative' | 'neutral' | 'positive') { return sentiment === 'negative' ? -0.7 : sentiment === 'positive' ? 0.7 : 0; }

async function runtimeContext() {
  const admin = storage();
  const { data: tenant, error: tenantError } = await admin.from('ai4cc_tenants').select('id,name').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (tenantError) throw tenantError;
  if (!tenant) throw new Error('No AI4CC tenant is configured');
  const [{ data: queues, error: queueError }, { data: agents, error: agentError }, { data: active, error: activeError }, { data: version, error: versionError }] = await Promise.all([
    admin.from('ai4cc_queues').select('id,name,code,channel,skills,priority,capacity,overflow_queue_id,status').eq('tenant_id', tenant.id).eq('status', 'active'),
    admin.from('ai4cc_agents').select('id,name,email,status,skills,channels').eq('tenant_id', tenant.id),
    admin.from('ai4cc_interactions').select('queue_id').eq('tenant_id', tenant.id).eq('status', 'active'),
    admin.from('ai4cc_flow_versions').select('id,ai4cc_flows!inner(tenant_id)').eq('ai4cc_flows.tenant_id', tenant.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (queueError) throw queueError; if (agentError) throw agentError; if (activeError) throw activeError; if (versionError) throw versionError;
  const activeByQueue: Record<string, number> = {};
  for (const row of active ?? []) if (row.queue_id) activeByQueue[row.queue_id] = (activeByQueue[row.queue_id] ?? 0) + 1;
  return { admin, tenant, queues: queues ?? [], agents: agents ?? [], activeByQueue, version: version ? { id: version.id as string } : null };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    validateOrigin(req);
    const body = (req.body ?? {}) as ChatBody;
    const sessionId = body.sessionId?.trim() ?? '';
    if (!validSessionId(sessionId)) return res.status(400).json({ error: 'A valid chat session id is required' });
    const ctx = await runtimeContext();
    const externalId = `webchat:${sessionId}`;
    const visitorId = (body.visitorId?.trim() || `visitor-${sessionId.slice(0, 8)}`).slice(0, 120);
    const { data: existing, error: existingError } = await ctx.admin.from('ai4cc_interactions').select('id,status,flow_version_id').eq('tenant_id', ctx.tenant.id).eq('channel', 'chat').eq('external_id', externalId).maybeSingle();
    if (existingError) throw existingError;

    if ((body.action ?? 'message') === 'end') {
      if (!existing) return res.status(404).json({ error: 'Chat session not found' });
      if (existing.status !== 'completed') {
        const { error: endError } = await ctx.admin.from('ai4cc_interactions').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('tenant_id', ctx.tenant.id).eq('id', existing.id);
        if (endError) throw endError;
        await ctx.admin.from('ai4cc_audit_logs').insert({ tenant_id: ctx.tenant.id, actor_user_id: null, action: 'webchat.session_completed', resource_type: 'interaction', resource_id: existing.id, payload: { sessionId, visitorId } });
      }
      return res.status(200).json({ ok: true, interactionId: existing.id, status: 'completed' });
    }

    const message = body.message?.trim() ?? '';
    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (message.length > 2000) return res.status(400).json({ error: 'Message is too long' });
    if (existing?.status === 'completed') return res.status(409).json({ error: 'This chat session has ended. Start a new chat.' });

    const { data: previousTurns, error: previousError } = existing ? await ctx.admin.from('ai4cc_transcripts').select('speaker,sequence_no,content,created_at').eq('tenant_id', ctx.tenant.id).eq('interaction_id', existing.id).order('sequence_no', { ascending: true }) : { data: [], error: null };
    if (previousError) throw previousError;
    const provisional: AssistSession = { sessionId: existing?.id ?? sessionId, flowId: existing?.flow_version_id ?? ctx.version?.id, channel: 'chat', turns: [...(previousTurns ?? []).filter((t:any)=>t.speaker==='customer'||t.speaker==='agent').map((t:any)=>({speaker:t.speaker,text:t.content,timestamp:t.created_at??new Date().toISOString()})), { speaker: 'customer', text: message, timestamp: new Date().toISOString() }] };
    const guidance = generateGuidance(provisional);
    const route = selectRuntimeRoute({ channel: 'chat', intent: guidance.detectedIntent, queues: ctx.queues, agents: ctx.agents, activeByQueue: ctx.activeByQueue });

    let interaction = existing;
    if (!interaction) {
      if (!ctx.version) return res.status(503).json({ error: 'No canonical flow version is available' });
      const { data: created, error: createError } = await ctx.admin.from('ai4cc_interactions').insert({ tenant_id: ctx.tenant.id, channel: 'chat', direction: 'inbound', external_id: externalId, customer_identifier: visitorId, queue_id: route.queue?.id ?? null, agent_id: route.agent?.id ?? null, flow_version_id: ctx.version.id, status: 'active', metadata: { source: 'ai4cc_web_chat', mode: 'development', sessionId, visitorId, routingEngine: 'runtime_optimizer' } }).select('id,status,flow_version_id').single();
      if (createError || !created) throw createError ?? new Error('Unable to create chat interaction');
      interaction = created;
      const { error: routeError } = await ctx.admin.from('ai4cc_routing_decisions').insert({ tenant_id: ctx.tenant.id, interaction_id: interaction.id, intent: guidance.detectedIntent, priority: guidance.state.escalationRisk === 'high' ? 'high' : 'normal', selected_queue_id: route.queue?.id ?? null, overflow_used: route.overflowUsed, estimated_wait_seconds: route.estimatedWaitSeconds, reason: route.reason, input: { source: 'runtime_optimizer', sessionId, visitorId, candidates: route.candidates } });
      if (routeError) throw routeError;
    } else {
      await ctx.admin.from('ai4cc_routing_decisions').update({ intent: guidance.detectedIntent, priority: guidance.state.escalationRisk === 'high' ? 'high' : 'normal', selected_queue_id: route.queue?.id ?? null, overflow_used: route.overflowUsed, estimated_wait_seconds: route.estimatedWaitSeconds, reason: route.reason, input: { source: 'runtime_optimizer', sessionId, visitorId, candidates: route.candidates } }).eq('tenant_id', ctx.tenant.id).eq('interaction_id', interaction.id);
      await ctx.admin.from('ai4cc_interactions').update({ queue_id: route.queue?.id ?? null, agent_id: route.agent?.id ?? null }).eq('tenant_id', ctx.tenant.id).eq('id', interaction.id);
    }

    const turns = existing ? previousTurns ?? [] : [];
    const nextSequence = (turns[turns.length - 1]?.sequence_no ?? 0) + 1;
    const reply = guidance.suggestedReplies[0] || 'I received your message and can help with the next step.';
    const complete: AssistSession = { ...provisional, sessionId: interaction.id, turns: [...provisional.turns, { speaker: 'agent', text: reply, timestamp: new Date().toISOString() }] };
    const { error: transcriptError } = await ctx.admin.from('ai4cc_transcripts').insert([
      { tenant_id: ctx.tenant.id, interaction_id: interaction.id, speaker: 'customer', sequence_no: nextSequence, content: message, sentiment: sentimentValue(guidance.state.sentiment), metadata: { source: 'ai4cc_web_chat', sessionId } },
      { tenant_id: ctx.tenant.id, interaction_id: interaction.id, speaker: 'agent', sequence_no: nextSequence + 1, content: reply, sentiment: 0.2, metadata: { source: 'ai4cc_web_chat_reply', sessionId } },
    ]);
    if (transcriptError) throw transcriptError;
    const { error: assistError } = await ctx.admin.from('ai4cc_agent_assist_events').insert({ tenant_id: ctx.tenant.id, interaction_id: interaction.id, agent_id: route.agent?.id ?? null, detected_intent: guidance.detectedIntent, sentiment: guidance.state.sentiment, escalation_risk: guidance.state.escalationRisk, suggested_replies: guidance.suggestedReplies, kb_grounding: guidance.kbGrounding, compliance_alerts: guidance.complianceAlerts, next_best_actions: guidance.nextBestActions, model_info: { engine: 'agentAssistEngine', mode: 'rules-live-web-chat', mappedFlowNode: guidance.mappedFlowNode, routingEngine: 'runtime_optimizer' } });
    if (assistError) throw assistError;
    const qa = generateQAReport({ transcripts: [{ id: interaction.id, agent: route.agent?.name ?? 'AI4CC Chat Agent', text: complete.turns.map((turn) => `${turn.speaker}: ${turn.text}`).join('\n'), sentiment: sentimentValue(guidance.state.sentiment), outcome: 'unresolved' }] });
    const score = qa.scorecards[0];
    const { error: qaError } = await ctx.admin.from('ai4cc_qa_scores').insert({ tenant_id: ctx.tenant.id, interaction_id: interaction.id, agent_id: route.agent?.id ?? null, quality_score: score.qualityScore, compliance_score: score.complianceScore, flow_adherence_score: score.flowAdherenceScore, sentiment_score: score.sentimentScore, flags: score.flags, scoring_method: 'rules', scorecard: { ...score, scoringMethodDetail: 'rules-live-web-chat', detectedIntent: guidance.detectedIntent, escalationRisk: guidance.state.escalationRisk } });
    if (qaError) throw qaError;
    const findings = guidance.complianceAlerts.length ? guidance.complianceAlerts : score.complianceScore < 100 ? [`Compliance score ${score.complianceScore} requires review.`] : [];
    if (findings.length) {
      const { data: existingFindings } = await ctx.admin.from('ai4cc_compliance_events').select('finding').eq('tenant_id', ctx.tenant.id).eq('interaction_id', interaction.id);
      const seen = new Set((existingFindings ?? []).map((row:any) => row.finding));
      const fresh = findings.filter((finding) => !seen.has(finding));
      if (fresh.length) { const { error } = await ctx.admin.from('ai4cc_compliance_events').insert(fresh.map((finding,index)=>({ tenant_id:ctx.tenant.id, interaction_id:interaction.id, rule_code:`CHAT-${Date.now()}-${index+1}`, severity:guidance.complianceAlerts.includes(finding)?'warning':'info', status:'open', finding, evidence:{source:'liveWebChat',sessionId,message,complianceScore:score.complianceScore} }))); if (error) throw error; }
    }
    await ctx.admin.from('ai4cc_interactions').update({ queue_id: route.queue?.id ?? null, agent_id: route.agent?.id ?? null, metadata: { source: 'ai4cc_web_chat', mode: 'development', sessionId, visitorId, detectedIntent: guidance.detectedIntent, sentiment: guidance.state.sentiment, escalationRisk: guidance.state.escalationRisk, routingEngine: 'runtime_optimizer', routingReason: route.reason } }).eq('tenant_id', ctx.tenant.id).eq('id', interaction.id);
    await ctx.admin.from('ai4cc_audit_logs').insert({ tenant_id: ctx.tenant.id, actor_user_id: null, action: 'webchat.message_processed', resource_type: 'interaction', resource_id: interaction.id, payload: { sessionId, visitorId, intent: guidance.detectedIntent, escalationRisk: guidance.state.escalationRisk, queueId: route.queue?.id ?? null, agentId: route.agent?.id ?? null, routingReason: route.reason, candidates: route.candidates, qa: qa.summary, reply } });
    return res.status(200).json({ ok: true, interactionId: interaction.id, sessionId, status: 'active', reply, route: { intent: guidance.detectedIntent, priority: guidance.state.escalationRisk === 'high' ? 'high' : 'normal', escalationRisk: guidance.state.escalationRisk, queue: route.queue, agent: route.agent, reason: route.reason, estimatedWaitSeconds: route.estimatedWaitSeconds }, qa: { quality: score.qualityScore, compliance: score.complianceScore, adherence: score.flowAdherenceScore, sentiment: score.sentimentScore } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Web chat request failed';
    return res.status(message === 'Invalid web chat origin' ? 403 : 500).json({ error: message });
  }
}
