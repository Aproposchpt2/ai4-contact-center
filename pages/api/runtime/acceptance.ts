import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';
import { generateGuidance, type AssistSession } from '@/lib/agentAssistEngine';
import { generateQAReport } from '@/lib/qualityAssuranceEngine';

type RuntimeBody = {
  versionId?: string;
  customerText?: string;
  agentText?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const ctx = await requireAi4ccContext(req);
    const body = (req.body ?? {}) as RuntimeBody;

    let versionId = body.versionId;
    if (!versionId) {
      const { data: version, error } = await ctx.admin
        .from('ai4cc_flow_versions')
        .select('id,ai4cc_flows!inner(tenant_id)')
        .eq('ai4cc_flows.tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      versionId = version?.id;
    }
    if (!versionId) return res.status(400).json({ error: 'No canonical flow version is available' });

    const { data: queue, error: queueError } = await ctx.admin
      .from('ai4cc_queues')
      .select('id,name,code')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (queueError) throw queueError;

    const { data: agent, error: agentError } = await ctx.admin
      .from('ai4cc_agents')
      .select('id,name,email')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'available')
      .limit(1)
      .maybeSingle();
    if (agentError) throw agentError;

    const customerText = body.customerText?.trim() || 'I am frustrated about a billing issue and need help with my account.';
    const agentText = body.agentText?.trim() || 'I understand. Let me verify your account and help resolve the billing issue.';

    const { data: interaction, error: interactionError } = await ctx.admin
      .from('ai4cc_interactions')
      .insert({
        tenant_id: ctx.tenantId,
        channel: 'simulation',
        direction: 'inbound',
        external_id: `acceptance-${Date.now()}`,
        customer_identifier: 'development-customer',
        queue_id: queue?.id ?? null,
        agent_id: agent?.id ?? null,
        flow_version_id: versionId,
        status: 'active',
        metadata: { source: 'runtime_acceptance', mode: 'development' },
      })
      .select('id,started_at')
      .single();
    if (interactionError || !interaction) throw interactionError ?? new Error('Unable to create interaction');

    const session: AssistSession = {
      sessionId: interaction.id,
      flowId: versionId,
      channel: 'voice',
      agentId: agent?.id,
      turns: [
        { speaker: 'customer', text: customerText, timestamp: new Date().toISOString() },
        { speaker: 'agent', text: agentText, timestamp: new Date().toISOString() },
      ],
    };
    const guidance = generateGuidance(session);

    await ctx.admin.from('ai4cc_routing_decisions').insert({
      tenant_id: ctx.tenantId,
      interaction_id: interaction.id,
      intent: guidance.detectedIntent,
      priority: guidance.state.escalationRisk === 'high' ? 'high' : 'normal',
      selected_queue_id: queue?.id ?? null,
      overflow_used: false,
      estimated_wait_seconds: 0,
      reason: queue ? `Development route to ${queue.name}` : 'No active queue available',
      input: { source: 'runtime_acceptance', guidanceIntent: guidance.detectedIntent },
    });

    await ctx.admin.from('ai4cc_transcripts').insert([
      { tenant_id: ctx.tenantId, interaction_id: interaction.id, speaker: 'customer', sequence_no: 1, content: customerText, sentiment: guidance.state.sentiment === 'negative' ? -0.7 : guidance.state.sentiment === 'positive' ? 0.7 : 0, metadata: { source: 'runtime_acceptance' } },
      { tenant_id: ctx.tenantId, interaction_id: interaction.id, speaker: 'agent', sequence_no: 2, content: agentText, sentiment: 0.2, metadata: { source: 'runtime_acceptance' } },
    ]);

    await ctx.admin.from('ai4cc_agent_assist_events').insert({
      tenant_id: ctx.tenantId,
      interaction_id: interaction.id,
      agent_id: agent?.id ?? null,
      detected_intent: guidance.detectedIntent,
      sentiment: guidance.state.sentiment,
      escalation_risk: guidance.state.escalationRisk,
      suggested_replies: guidance.suggestedReplies,
      kb_grounding: guidance.kbGrounding,
      compliance_alerts: guidance.complianceAlerts,
      next_best_actions: guidance.nextBestActions,
      model_info: { engine: 'agentAssistEngine', mode: 'rules-development' },
    });

    const qa = generateQAReport({
      transcripts: [{
        id: interaction.id,
        agent: agent?.name ?? 'Development Agent',
        text: `${customerText}\n${agentText}`,
        sentiment: guidance.state.sentiment === 'negative' ? -0.7 : guidance.state.sentiment === 'positive' ? 0.7 : 0,
        outcome: 'resolved',
      }],
    });
    const score = qa.scorecards[0];

    await ctx.admin.from('ai4cc_qa_scores').insert({
      tenant_id: ctx.tenantId,
      interaction_id: interaction.id,
      agent_id: agent?.id ?? null,
      quality_score: score.qualityScore,
      compliance_score: score.complianceScore,
      flow_adherence_score: score.flowAdherenceScore,
      sentiment_score: score.sentimentScore,
      flags: score.flags,
      scoring_method: 'rules',
      scorecard: score,
    });

    const namedFindings = qa.complianceFindings.flatMap((finding) => finding.issues);
    const complianceEvents = namedFindings.map((finding, index) => ({
      tenant_id: ctx.tenantId,
      interaction_id: interaction.id,
      rule_code: `DEV-${index + 1}`,
      severity: 'warning',
      status: 'open',
      finding,
      evidence: { transcript: `${customerText}\n${agentText}`, source: 'qualityAssuranceEngine', complianceScore: score.complianceScore },
    }));

    if (score.complianceScore < 100 && complianceEvents.length === 0) {
      complianceEvents.push({
        tenant_id: ctx.tenantId,
        interaction_id: interaction.id,
        rule_code: 'DEV-QA-COMPLIANCE',
        severity: score.complianceScore < 80 ? 'warning' : 'info',
        status: 'open',
        finding: `QA compliance score was ${score.complianceScore}/100; review is required even though no named rule issue was emitted.`,
        evidence: {
          transcript: `${customerText}\n${agentText}`,
          source: 'qualityAssuranceEngine',
          complianceScore: score.complianceScore,
          scorecard: score,
        },
      });
    }

    if (complianceEvents.length) {
      const { error: complianceError } = await ctx.admin.from('ai4cc_compliance_events').insert(complianceEvents);
      if (complianceError) throw complianceError;
    }

    await ctx.admin
      .from('ai4cc_interactions')
      .update({ status: 'completed', ended_at: new Date().toISOString(), metadata: { source: 'runtime_acceptance', mode: 'development', qaSummary: qa.summary } })
      .eq('id', interaction.id)
      .eq('tenant_id', ctx.tenantId);

    await ctx.admin.from('ai4cc_audit_logs').insert({
      tenant_id: ctx.tenantId,
      actor_user_id: ctx.userId,
      action: 'runtime.acceptance_completed',
      resource_type: 'interaction',
      resource_id: interaction.id,
      payload: { versionId, queueId: queue?.id ?? null, agentId: agent?.id ?? null, intent: guidance.detectedIntent, qa: qa.summary, complianceEventCount: complianceEvents.length },
    });

    return res.status(200).json({
      ok: true,
      interactionId: interaction.id,
      flowVersionId: versionId,
      route: { queue, agent, intent: guidance.detectedIntent, escalationRisk: guidance.state.escalationRisk },
      assist: guidance,
      qa,
      complianceFindings: complianceEvents.map((event) => event.finding),
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
