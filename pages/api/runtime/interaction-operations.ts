import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

const ALLOWED_ROLES = new Set(['owner', 'admin', 'supervisor', 'operator', 'agent']);
const DISPOSITIONS = new Set(['resolved', 'callback_required', 'follow_up', 'transferred', 'no_action_required']);

type Operation = 'claim' | 'callback_pending' | 'complete' | 'reopen';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'PUT only' });

  try {
    const ctx = await requireAi4ccContext(req);
    if (!ALLOWED_ROLES.has(String(ctx.role).toLowerCase())) return res.status(403).json({ error: 'Role is not authorized for agent operations' });

    const interactionId = typeof req.body?.interactionId === 'string' ? req.body.interactionId : '';
    const operation = req.body?.operation as Operation;
    const disposition = typeof req.body?.disposition === 'string' ? req.body.disposition : null;
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 1000) : '';

    if (!interactionId) return res.status(400).json({ error: 'interactionId is required' });
    if (!['claim', 'callback_pending', 'complete', 'reopen'].includes(operation)) return res.status(400).json({ error: 'Unsupported operation' });
    if (operation === 'complete' && (!disposition || !DISPOSITIONS.has(disposition))) {
      return res.status(400).json({ error: 'A valid disposition is required to complete an interaction' });
    }

    const { data: interaction, error: interactionError } = await ctx.admin
      .from('ai4cc_interactions')
      .select('id,channel,status,agent_id,metadata,ended_at')
      .eq('id', interactionId)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();
    if (interactionError) throw interactionError;
    if (!interaction) return res.status(404).json({ error: 'Interaction not found' });

    let agentId = interaction.agent_id as string | null;
    if (operation === 'claim' && !agentId) {
      const { data: availableAgent, error: agentError } = await ctx.admin
        .from('ai4cc_agents')
        .select('id,channels,status')
        .eq('tenant_id', ctx.tenantId)
        .eq('status', 'available')
        .limit(20);
      if (agentError) throw agentError;
      const matched = (availableAgent ?? []).find((agent: any) => {
        const channels = Array.isArray(agent.channels) ? agent.channels.map((value: string) => value.toLowerCase()) : [];
        return channels.length === 0 || channels.includes('all') || channels.includes('omnichannel') || channels.includes(String(interaction.channel).toLowerCase());
      });
      agentId = matched?.id ?? null;
      if (!agentId) return res.status(409).json({ error: 'No available agent can claim this interaction' });
    }

    const now = new Date().toISOString();
    const currentMetadata = interaction.metadata && typeof interaction.metadata === 'object' ? interaction.metadata : {};
    const metadata: Record<string, unknown> = {
      ...currentMetadata,
      lastAgentAction: operation,
      lastAgentActionAt: now,
      lastAgentActionBy: ctx.userId,
    };

    let status = interaction.status as string;
    let endedAt = interaction.ended_at as string | null;

    if (operation === 'claim') {
      if (!['open', 'queued', 'active'].includes(status)) return res.status(409).json({ error: `Cannot claim interaction in ${status} status` });
      status = 'active';
      metadata.operationalState = 'claimed';
    }

    if (operation === 'callback_pending') {
      metadata.callbackStatus = 'callback_pending';
      metadata.operationalState = 'callback_pending';
      if (note) metadata.callbackNote = note;
    }

    if (operation === 'complete') {
      status = 'completed';
      endedAt = endedAt ?? now;
      metadata.agentDisposition = disposition;
      metadata.dispositionNote = note || null;
      metadata.operationalState = 'completed';
      if (disposition === 'callback_required') metadata.callbackStatus = 'callback_pending';
      if (disposition === 'resolved' || disposition === 'no_action_required') metadata.callbackStatus = 'resolved';
    }

    if (operation === 'reopen') {
      if (status !== 'completed') return res.status(409).json({ error: 'Only completed interactions can be reopened' });
      status = 'open';
      endedAt = null;
      metadata.operationalState = 'reopened';
      metadata.reopenedAt = now;
    }

    const { data: updated, error: updateError } = await ctx.admin
      .from('ai4cc_interactions')
      .update({ status, agent_id: agentId, ended_at: endedAt, metadata })
      .eq('id', interactionId)
      .eq('tenant_id', ctx.tenantId)
      .select('id,status,agent_id,ended_at,metadata')
      .single();
    if (updateError) throw updateError;

    const { error: auditError } = await ctx.admin.from('ai4cc_audit_logs').insert({
      tenant_id: ctx.tenantId,
      actor_user_id: ctx.userId,
      action: `agent.interaction_${operation}`,
      resource_type: 'interaction',
      resource_id: interactionId,
      payload: {
        operation,
        disposition,
        note: note || null,
        previousStatus: interaction.status,
        status,
        agentId,
        channel: interaction.channel,
      },
    });
    if (auditError) throw auditError;

    return res.status(200).json({ interaction: updated });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
