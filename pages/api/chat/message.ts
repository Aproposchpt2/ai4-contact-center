import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateGuidance, type AssistSession } from '@/lib/agentAssistEngine';
import { generateQAReport } from '@/lib/qualityAssuranceEngine';

type ChatBody = {
  action?: 'message' | 'end';
  sessionId?: string;
  visitorId?: string;
  message?: string;
};

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
  if (!origin || !host) throw new Error('Invalid web chat origin');
  if (new URL(origin).host !== host) throw new Error('Invalid web chat origin');
}

function validSessionId(value: string) {
  return /^[A-Za-z0-9_-]{8,80}$/.test(value);
}

async function runtimeContext() {
  const admin = storage();
  const { data: tenant, error: tenantError } = await admin.from('ai4cc_tenants').select('id,name').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (tenantError) throw tenantError;
  if (!tenant) throw new Error('No AI4CC tenant is configured');

  const { data: queue, error: queueError } = await admin.from('ai4cc_queues').select('id,name,code').eq('tenant_id', tenant.id).eq('status', 'active').order('priority', { ascending: false }).limit(1).maybeSingle();
  if (queueError) throw queueError;

  const { data: agent, error: agentError } = await admin.from('ai4cc_agents').select('id,name,email').eq('tenant_id', tenant.id).eq('status', 'available').limit(1).maybeSingle();
  if (agentError) throw agentError;

  const { data: version, error: versionError } = await admin.from('ai4cc_flow_versions').select('id,ai4cc_flows!inner(tenant_id)').eq('ai4cc_flows.tenant_id', tenant.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (versionError) throw versionError;

  return { admin, tenant, queue, agent, version: version ? { id: version.id as string } : null };
}

function sentimentValue(sentiment: 'negative' | 'neutral' | 'positive') {
  return sentiment === 'negative' ? -0.7 : sentiment === 'positive' ? 0.7 : 0;
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

    let interaction = existing;
    if (!interaction) {
      if (!ctx.version) return res.status(503).json({ error: 'No canonical flow version is available' });
      const { data: created, error: createError } = await ctx.admin.from('ai4cc_interactions').insert({
        tenant_id: ctx.tenant.id,
        channel: 'chat',
        direction: 'inbound',
        external_id: externalId,
        customer_identifier: visitorId,
        queue_id: ctx.queue?.id ?? null,
        agent_id: ctx.agent?.id ?? null,
        flow_version_id: ctx.version.id,
        status: 'active',
        metadata: { source: 'ai4cc_web_chat', mode: 'development', sessionId, visitorId },
      }).select('id,status,flow_version_id').single();
      if (createError || !created) throw createError ?? new Error('Unable to create chat interaction');
      interaction = created;

      const { error: routeError } = await ctx.admin.from('ai4cc_routing_decisions').insert({
        tenant_id: ctx.tenant.id,
        interaction_id: interaction.id,
        intent: 'live_chat_intake',
        priority: 'normal',
        selected_queue_id: ctx.queue?.id ?? null,
        overflow_used: false,
        estimated_wait_seconds: 0,
        reason: ctx.queue ? `Web chat route to ${ctx.queue.name}` : 'No active queue available',
        input: { source: 'ai4cc_web_chat', sessionId, visitorId },
      });
      if (routeError) throw routeError;
    }

    const { data: previousTurns, error: turnsError } = await ctx.admin.from('ai4cc_transcripts').select('speaker,sequence_no,content,created_at').eq('tenant_id', ctx.tenant.id).eq('interaction_id', interaction.id).order('sequence_no', { ascending: true });
    if (turnsError) throw turnsError;
    const nextSequence = (previousTurns?.[previousTurns.length - 1]?.sequence_no ?? 0) + 1;

    const provisionalSession: AssistSession = {
      sessionId: interaction.id,
      flowId: interaction.flow_version_id ?? ctx.version?.id,
      channel: 'chat',
      agentId: ctx.agent?.id,
      turns: [
        ...(previousTurns ?? []).filter((turn) => turn.speaker === 'customer' || turn.speaker === 'agent').map((turn) => ({ speaker: turn.speaker as 'customer' | 'agent', text: turn.content, timestamp: turn.created_at ?? new Date().toISOString() })),
        { speaker: 'customer', text: message, timestamp: new Date().toISOString() },
      ],
    };
    const guidance = generateGuidance(provisionalSession);
    const reply = guidance.suggestedReplies[0] || 'I received your message and can help with the next step.';
    const completeSession: AssistSession = { ...provisionalSession, turns: [...provisionalSession.turns, { speaker: 'agent', text: reply, timestamp: new Date().toISOString() }] };

    const { error: transcriptError } = await ctx.admin.from('ai4cc_transcripts').insert([
      { tenant_id: ctx.tenant.id, interaction_id: interaction.id, speaker: 'customer', sequence_no: nextSequence, content: message, sentiment: sentimentValue(guidance.state.sentiment), metadata: { source: 'ai4cc_web_chat', sessionId } },
      { tenant_id: ctx.tenant.id, interaction_id: interaction.id, speaker: 'agent', sequence_no: nextSequence + 1, content: reply, sentiment: 0.2, metadata: { source: 'ai4cc_web_chat_reply', sessionId } },
    ]);
    if (transcriptError) throw transcriptError;

    const { error: assistError } = await ctx.admin.from('ai4cc_agent_assist_events').insert({
      tenant_id: ctx.tenant.id,
      interaction_id: interaction.id,
      agent_id: ctx.agent?.id ?? null,
      detected_intent: guidance.detectedIntent,
      sentiment: guidance.state.sentiment,
      escalation_risk: guidance.state.escalationRisk,
      suggested_replies: guidance.suggestedReplies,
      kb_grounding: guidance.kbGrounding,
      compliance_alerts: guidance.complianceAlerts,
      next_best_actions: guidance.nextBestActions,
      model_info: { engine: 'agentAssistEngine', mode: 'rules-live-web-chat', mappedFlowNode: guidance.mappedFlowNode },
    });
    if (assistError) throw assistError;

    const qa = generateQAReport({ transcripts: [{ id: interaction.id, agent: ctx.agent?.name ?? 'AI4CC Chat Agent', text: completeSession.turns.map((turn) => `${turn.speaker}: ${turn.text}`).join('\n'), sentiment: sentimentValue(guidance.state.sentiment), outcome: 'unresolved' }] });
    const score = qa.scorecards[0];
    const { error: qaError } = await ctx.admin.from('ai4cc_qa_scores').insert({ tenant_id: ctx.tenant.id, interaction_id: interaction.id, agent_id: ctx.agent?.id ?? null, quality_score: score.qualityScore, compliance_score: score.complianceScore, flow_adherence_score: score.flowAdherenceScore, sentiment_score: score.sentimentScore, flags: score.flags, scoring_method: 'rules', scorecard: { ...score, scoringMethodDetail: 'rules-live-web-chat', detectedIntent: guidance.detectedIntent, escalationRisk: guidance.state.escalationRisk } });
    if (qaError) throw qaError;

    const namedFindings = guidance.complianceAlerts;
    const fallbackFinding = score.complianceScore < 100 && namedFindings.length === 0 ? [`Compliance score ${score.complianceScore} requires review.`] : [];
    const findings = [...namedFindings, ...fallbackFinding];
    if (findings.length) {
      const { data: existingFindings, error: findingsError } = await ctx.admin.from('ai4cc_compliance_events').select('finding').eq('tenant_id', ctx.tenant.id).eq('interaction_id', interaction.id);
      if (findingsError) throw findingsError;
      const seen = new Set((existingFindings ?? []).map((row) => row.finding));
      const newFindings = findings.filter((finding) => !seen.has(finding));
      if (newFindings.length) {
        const { error: complianceError } = await ctx.admin.from('ai4cc_compliance_events').insert(newFindings.map((finding, index) => ({ tenant_id: ctx.tenant.id, interaction_id: interaction.id, rule_code: `CHAT-${Date.now()}-${index + 1}`, severity: namedFindings.includes(finding) ? 'warning' : 'info', status: 'open', finding, evidence: { source: 'liveWebChat', sessionId, message, complianceScore: score.complianceScore } })));
        if (complianceError) throw complianceError;
      }
    }

    const { error: routeUpdateError } = await ctx.admin.from('ai4cc_routing_decisions').update({ intent: guidance.detectedIntent, priority: guidance.state.escalationRisk === 'high' ? 'high' : 'normal', input: { source: 'ai4cc_web_chat_intelligence', sessionId, detectedIntent: guidance.detectedIntent, escalationRisk: guidance.state.escalationRisk } }).eq('tenant_id', ctx.tenant.id).eq('interaction_id', interaction.id);
    if (routeUpdateError) throw routeUpdateError;

    const { error: metadataError } = await ctx.admin.from('ai4cc_interactions').update({ metadata: { source: 'ai4cc_web_chat', mode: 'development', sessionId, visitorId, detectedIntent: guidance.detectedIntent, sentiment: guidance.state.sentiment, escalationRisk: guidance.state.escalationRisk } }).eq('tenant_id', ctx.tenant.id).eq('id', interaction.id);
    if (metadataError) throw metadataError;

    await ctx.admin.from('ai4cc_audit_logs').insert({ tenant_id: ctx.tenant.id, actor_user_id: null, action: 'webchat.message_processed', resource_type: 'interaction', resource_id: interaction.id, payload: { sessionId, visitorId, intent: guidance.detectedIntent, escalationRisk: guidance.state.escalationRisk, qa: qa.summary, reply } });

    return res.status(200).json({ ok: true, interactionId: interaction.id, sessionId, status: 'active', reply, route: { intent: guidance.detectedIntent, priority: guidance.state.escalationRisk === 'high' ? 'high' : 'normal', escalationRisk: guidance.state.escalationRisk }, qa: { quality: score.qualityScore, compliance: score.complianceScore, adherence: score.flowAdherenceScore, sentiment: score.sentimentScore } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Web chat request failed';
    const status = message === 'Invalid web chat origin' ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}
