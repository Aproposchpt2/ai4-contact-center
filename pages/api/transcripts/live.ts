import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';
import {
  analyzeTranscript,
  generateIntelligenceReport,
  mapTranscriptToFlow,
  type NormalizedTranscript,
  type TranscriptChannel,
  type TranscriptSpeaker,
} from '@/lib/transcriptIntelligenceEngine';

function normalizeChannel(channel: string): TranscriptChannel {
  if (channel === 'sms') return 'sms';
  if (channel === 'chat') return 'chat';
  if (channel === 'email') return 'email';
  return 'voice';
}

function normalizeSpeaker(speaker: string): TranscriptSpeaker {
  if (speaker === 'agent' || speaker === 'customer' || speaker === 'system') return speaker;
  return 'unknown';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  try {
    const ctx = await requireAi4ccContext(req);
    const interactionId = typeof req.query.interactionId === 'string' ? req.query.interactionId : null;

    let query = ctx.admin
      .from('ai4cc_interactions')
      .select('id,channel,external_id,customer_identifier,status,started_at,ended_at,metadata,queue_id,agent_id')
      .eq('tenant_id', ctx.tenantId);
    query = interactionId ? query.eq('id', interactionId) : query.order('started_at', { ascending: false }).limit(1);
    const { data: interaction, error } = await query.maybeSingle();
    if (error) throw error;
    if (!interaction) return res.status(404).json({ error: 'Interaction not found' });

    const [transcriptResult, queueResult, agentResult, routeResult] = await Promise.all([
      ctx.admin.from('ai4cc_transcripts').select('id,speaker,sequence_no,content,sentiment,metadata,created_at').eq('interaction_id', interaction.id).order('sequence_no', { ascending: true }),
      interaction.queue_id ? ctx.admin.from('ai4cc_queues').select('id,name,code').eq('id', interaction.queue_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      interaction.agent_id ? ctx.admin.from('ai4cc_agents').select('id,name,email,status').eq('id', interaction.agent_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ctx.admin.from('ai4cc_routing_decisions').select('intent,priority,reason,estimated_wait_seconds,overflow_used,decided_at').eq('interaction_id', interaction.id).order('decided_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const relatedError = [transcriptResult.error, queueResult.error, agentResult.error, routeResult.error].find(Boolean);
    if (relatedError) throw relatedError;
    const rows = transcriptResult.data ?? [];
    if (!rows.length) return res.status(409).json({ error: 'Interaction has no canonical transcript yet' });

    const turns = rows.map((row: any) => ({
      id: row.id as string,
      timestamp: row.created_at as string,
      speaker: normalizeSpeaker(String(row.speaker ?? 'unknown')),
      text: String(row.content ?? ''),
    })).filter((turn: any) => turn.text.trim().length > 0);
    const startedAt = turns[0]?.timestamp ?? interaction.started_at;
    const endedAt = turns[turns.length - 1]?.timestamp ?? interaction.ended_at ?? startedAt;
    const transcript: NormalizedTranscript = {
      id: `live-${interaction.id}`,
      channel: normalizeChannel(interaction.channel),
      sourceName: `AI4CC live interaction ${interaction.id}`,
      rawText: turns.map((turn: any) => `${turn.speaker}: ${turn.text}`).join('\n'),
      turns,
      metadata: {
        startedAt,
        endedAt,
        turnCount: turns.length,
        customerTurns: turns.filter((turn: any) => turn.speaker === 'customer').length,
        agentTurns: turns.filter((turn: any) => turn.speaker === 'agent').length,
        durationSeconds: Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(startedAt)) / 1000)),
      },
    };
    const analysis = analyzeTranscript(transcript);
    const flowMapping = mapTranscriptToFlow(transcript);
    const report = generateIntelligenceReport({ transcript, analysis, flowMapping });

    return res.status(200).json({
      interaction: { ...interaction, queue: queueResult.data, agent: agentResult.data, route: routeResult.data },
      report,
      source: 'canonical-runtime',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
