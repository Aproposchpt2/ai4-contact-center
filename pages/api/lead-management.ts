import type { NextApiRequest, NextApiResponse } from 'next';
import { apiErrorMessage, apiErrorStatus, requireAi4ccContext } from '@/lib/ai4ccServer';

const STAGES = new Set(['new','qualified','contacted','follow_up','opportunity','converted','lost','nurture']);
const PRIORITIES = new Set(['low','normal','high','urgent']);

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function number(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { admin, tenantId, userId } = await requireAi4ccContext(req);

    if (req.method === 'GET') {
      const { data: leads, error } = await admin
        .from('ai4cc_leads')
        .select('*, contact:ai4cc_contacts(*), assigned_agent:ai4cc_agents!ai4cc_leads_assigned_agent_id_fkey(id,name,email,status), originating_queue:ai4cc_queues!ai4cc_leads_originating_queue_id_fkey(id,name,code), originating_agent:ai4cc_agents!ai4cc_leads_originating_agent_id_fkey(id,name,email,status)')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(250);
      if (error) throw error;
      return res.status(200).json({ leads: leads ?? [] });
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const interactionId = text(body.interactionId);
      if (!interactionId) return res.status(400).json({ error: 'interactionId is required' });

      const { data: interaction, error: interactionError } = await admin
        .from('ai4cc_interactions')
        .select('id,tenant_id,channel,customer_identifier,queue_id,agent_id,metadata,started_at')
        .eq('tenant_id', tenantId)
        .eq('id', interactionId)
        .maybeSingle();
      if (interactionError) throw interactionError;
      if (!interaction) return res.status(404).json({ error: 'Interaction was not found for this tenant' });

      const { data: existingLead, error: existingError } = await admin
        .from('ai4cc_leads')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('originating_interaction_id', interactionId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existingLead) return res.status(409).json({ error: 'A lead already exists for this originating interaction', leadId: existingLead.id });

      const identifier = text(interaction.customer_identifier);
      const email = identifier.includes('@') ? identifier.toLowerCase() : null;
      const phone = !email && identifier ? identifier : null;

      let contact: any = null;
      if (email) {
        const found = await admin.from('ai4cc_contacts').select('*').eq('tenant_id', tenantId).ilike('email', email).limit(1).maybeSingle();
        if (found.error) throw found.error; contact = found.data;
      } else if (phone) {
        const found = await admin.from('ai4cc_contacts').select('*').eq('tenant_id', tenantId).eq('phone', phone).limit(1).maybeSingle();
        if (found.error) throw found.error; contact = found.data;
      }

      if (!contact) {
        const inserted = await admin.from('ai4cc_contacts').insert({
          tenant_id: tenantId,
          display_name: text(body.contactName) || identifier || 'Unknown contact',
          company_name: text(body.companyName) || null,
          email,
          phone,
          preferred_channel: interaction.channel,
          lead_source: `ai4cc_${interaction.channel}`,
          lead_score: Math.max(0, Math.min(100, number(body.score, 50))),
          priority: PRIORITIES.has(text(body.priority)) ? text(body.priority) : 'normal',
          metadata: { originatingInteractionId: interactionId },
        }).select('*').single();
        if (inserted.error) throw inserted.error; contact = inserted.data;
      }

      const intent = text(interaction.metadata?.detectedIntent || interaction.metadata?.routingIntent);
      const stage = STAGES.has(text(body.pipelineStage)) ? text(body.pipelineStage) : 'new';
      const priority = PRIORITIES.has(text(body.priority)) ? text(body.priority) : 'normal';
      const leadInsert = await admin.from('ai4cc_leads').insert({
        tenant_id: tenantId,
        contact_id: contact.id,
        originating_interaction_id: interaction.id,
        originating_channel: interaction.channel,
        originating_queue_id: interaction.queue_id,
        originating_agent_id: interaction.agent_id,
        assigned_agent_id: interaction.agent_id,
        title: text(body.title) || `${intent ? intent.replace(/_/g, ' ') : interaction.channel} lead`,
        service_interest: text(body.serviceInterest) || intent || null,
        description: text(body.description) || `Lead created from canonical AI4CC ${interaction.channel} interaction.`,
        pipeline_stage: stage,
        priority,
        score: Math.max(0, Math.min(100, number(body.score, 50))),
        estimated_value: Math.max(0, number(body.estimatedValue, 0)),
        probability: Math.max(0, Math.min(100, number(body.probability, 0))),
        next_action: text(body.nextAction) || 'Review interaction and determine follow-up.',
        next_follow_up: body.nextFollowUp || null,
        metadata: { source: 'ai4cc_interaction', originatingInteractionStartedAt: interaction.started_at },
      }).select('*').single();
      if (leadInsert.error) throw leadInsert.error;

      await admin.from('ai4cc_lead_activities').insert({
        tenant_id: tenantId, lead_id: leadInsert.data.id, contact_id: contact.id,
        interaction_id: interaction.id, activity_type: 'lead_created', direction: 'internal',
        subject: 'Lead created from AI4CC interaction', actor_user_id: userId,
        actor_agent_id: interaction.agent_id,
        metadata: { channel: interaction.channel, intent },
      });
      await admin.from('ai4cc_audit_logs').insert({
        tenant_id: tenantId, actor_user_id: userId, action: 'lead.created_from_interaction',
        resource_type: 'ai4cc_lead', resource_id: leadInsert.data.id,
        payload: { contactId: contact.id, interactionId, channel: interaction.channel, intent },
      });
      return res.status(201).json({ lead: leadInsert.data, contact });
    }

    if (req.method === 'PATCH') {
      const body = req.body ?? {};
      const leadId = text(body.leadId);
      if (!leadId) return res.status(400).json({ error: 'leadId is required' });
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (STAGES.has(text(body.pipelineStage))) patch.pipeline_stage = text(body.pipelineStage);
      if (PRIORITIES.has(text(body.priority))) patch.priority = text(body.priority);
      if (body.score !== undefined) patch.score = Math.max(0, Math.min(100, number(body.score)));
      if (body.probability !== undefined) patch.probability = Math.max(0, Math.min(100, number(body.probability)));
      if (body.estimatedValue !== undefined) patch.estimated_value = Math.max(0, number(body.estimatedValue));
      if (body.nextAction !== undefined) patch.next_action = text(body.nextAction) || null;
      if (body.nextFollowUp !== undefined) patch.next_follow_up = body.nextFollowUp || null;
      if (body.lostReason !== undefined) patch.lost_reason = text(body.lostReason) || null;
      if (patch.pipeline_stage === 'converted') { patch.status = 'won'; patch.converted_at = new Date().toISOString(); }
      if (patch.pipeline_stage === 'lost') patch.status = 'lost';

      const updated = await admin.from('ai4cc_leads').update(patch).eq('tenant_id', tenantId).eq('id', leadId).select('*').maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) return res.status(404).json({ error: 'Lead not found' });
      await admin.from('ai4cc_lead_activities').insert({ tenant_id: tenantId, lead_id: leadId, contact_id: updated.data.contact_id, activity_type: 'lead_updated', direction: 'internal', subject: 'Lead lifecycle updated', actor_user_id: userId, metadata: patch });
      await admin.from('ai4cc_audit_logs').insert({ tenant_id: tenantId, actor_user_id: userId, action: 'lead.lifecycle_updated', resource_type: 'ai4cc_lead', resource_id: leadId, payload: patch });
      return res.status(200).json({ lead: updated.data });
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
