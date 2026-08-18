import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const ctx = await requireAi4ccContext(req);
    const { data: interactions, error } = await ctx.admin
      .from('ai4cc_interactions')
      .select('id,channel,direction,external_id,customer_identifier,status,started_at,ended_at,metadata,queue_id,agent_id,flow_version_id')
      .eq('tenant_id', ctx.tenantId)
      .order('started_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    const hydrated = await Promise.all((interactions ?? []).map(async (interaction: any) => {
      const [queueResult, agentResult, routeResult, transcriptResult, assistResult, qaResult, complianceResult] = await Promise.all([
        interaction.queue_id
          ? ctx.admin.from('ai4cc_queues').select('id,name,code').eq('id', interaction.queue_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        interaction.agent_id
          ? ctx.admin.from('ai4cc_agents').select('id,name,email,status').eq('id', interaction.agent_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        ctx.admin.from('ai4cc_routing_decisions').select('intent,priority,reason,estimated_wait_seconds,overflow_used,decided_at').eq('interaction_id', interaction.id).order('decided_at', { ascending: false }).limit(1).maybeSingle(),
        ctx.admin.from('ai4cc_transcripts').select('speaker,sequence_no,content,sentiment,created_at').eq('interaction_id', interaction.id).order('sequence_no', { ascending: true }),
        ctx.admin.from('ai4cc_agent_assist_events').select('detected_intent,sentiment,escalation_risk,suggested_replies,kb_grounding,compliance_alerts,next_best_actions,model_info,created_at').eq('interaction_id', interaction.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ctx.admin.from('ai4cc_qa_scores').select('quality_score,compliance_score,flow_adherence_score,sentiment_score,flags,scoring_method,scorecard,scored_at').eq('interaction_id', interaction.id).order('scored_at', { ascending: false }).limit(1).maybeSingle(),
        ctx.admin.from('ai4cc_compliance_events').select('rule_code,severity,status,finding,detected_at').eq('interaction_id', interaction.id).order('detected_at', { ascending: false }),
      ]);

      const relatedError = [queueResult.error, agentResult.error, routeResult.error, transcriptResult.error, assistResult.error, qaResult.error, complianceResult.error].find(Boolean);
      if (relatedError) throw relatedError;

      return {
        ...interaction,
        queue: queueResult.data,
        agent: agentResult.data,
        route: routeResult.data,
        transcript: transcriptResult.data ?? [],
        assist: assistResult.data,
        qa: qaResult.data,
        compliance: complianceResult.data ?? [],
      };
    }));

    return res.status(200).json({ interactions: hydrated });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
