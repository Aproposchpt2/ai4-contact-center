import type { NextApiRequest, NextApiResponse } from 'next';
import { apiErrorMessage, apiErrorStatus, requireAi4ccContext } from '@/lib/ai4ccServer';

const STAGES = new Set(['new','qualified','contacted','follow_up','opportunity','converted','lost','nurture']);
const PRIORITIES = new Set(['low','normal','high','urgent']);

type IdentifierType = 'email' | 'phone' | 'opaque';
type IdentifierClassification = {
  type: IdentifierType;
  value: string;
  email: string | null;
  phone: string | null;
};

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function number(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

function normalizePhone(value: string): string | null {
  const raw = value.trim();
  if (!raw || !/^[+\d().\-\s]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits;
}

function classifyIdentifier(value: unknown): IdentifierClassification {
  const identifier = text(value);
  const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (identifier && emailLike.test(identifier)) {
    return { type: 'email', value: identifier, email: identifier.toLowerCase(), phone: null };
  }

  const phone = normalizePhone(identifier);
  if (phone) return { type: 'phone', value: identifier, email: null, phone };

  return { type: 'opaque', value: identifier, email: null, phone: null };
}

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
        .select('id,tenant_id,channel,status,customer_identifier,queue_id,agent_id,metadata,started_at')
        .eq('tenant_id', tenantId)
        .eq('id', interactionId)
        .maybeSingle();
      if (interactionError) throw interactionError;
      if (!interaction) return res.status(404).json({ error: 'Interaction was not found for this tenant' });
      if (interaction.status !== 'completed') {
        return res.status(409).json({ error: 'Interaction must be completed before creating a Lead' });
      }

      const { data: existingLead, error: existingError } = await admin
        .from('ai4cc_leads')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('originating_interaction_id', interactionId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existingLead) return res.status(409).json({ error: 'A lead already exists for this originating interaction', leadId: existingLead.id });

      const identifier = classifyIdentifier(interaction.customer_identifier);
      const intent = text(interaction.metadata?.detectedIntent || interaction.metadata?.routingIntent);
      const stage = STAGES.has(text(body.pipelineStage)) ? text(body.pipelineStage) : 'new';
      const priority = PRIORITIES.has(text(body.priority)) ? text(body.priority) : 'normal';
      const score = Math.max(0, Math.min(100, number(body.score, 50)));
      const estimatedValue = Math.max(0, number(body.estimatedValue, 0));
      const probability = Math.max(0, Math.min(100, number(body.probability, 0)));

      const { data: lifecycle, error: lifecycleError } = await admin.rpc('ai4cc_create_lead_from_interaction', {
        p_tenant_id: tenantId,
        p_actor_user_id: userId,
        p_interaction_id: interactionId,
        p_identifier_type: identifier.type,
        p_identifier_value: identifier.value,
        p_email: identifier.email,
        p_phone: identifier.phone,
        p_contact_name: text(body.contactName) || identifier.value || 'Unknown contact',
        p_company_name: text(body.companyName) || null,
        p_title: text(body.title) || `${intent ? intent.replace(/_/g, ' ') : interaction.channel} lead`,
        p_service_interest: text(body.serviceInterest) || intent || null,
        p_description: text(body.description) || `Lead created from canonical AI4CC ${interaction.channel} interaction.`,
        p_pipeline_stage: stage,
        p_priority: priority,
        p_score: score,
        p_estimated_value: estimatedValue,
        p_probability: probability,
        p_next_action: text(body.nextAction) || 'Review interaction and determine follow-up.',
        p_next_follow_up: body.nextFollowUp || null,
      });

      if (lifecycleError) {
        if (lifecycleError.code === '23505') {
          const { data: duplicateLead } = await admin
            .from('ai4cc_leads')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('originating_interaction_id', interactionId)
            .maybeSingle();
          return res.status(409).json({
            error: 'A lead already exists for this originating interaction',
            ...(duplicateLead?.id ? { leadId: duplicateLead.id } : {}),
          });
        }
        if (lifecycleError.message.includes('AI4CC_INTERACTION_NOT_COMPLETED')) {
          return res.status(409).json({ error: 'Interaction must be completed before creating a Lead' });
        }
        if (lifecycleError.message.includes('AI4CC_INTERACTION_NOT_FOUND')) {
          return res.status(404).json({ error: 'Interaction was not found for this tenant' });
        }
        if (lifecycleError.message.includes('AI4CC_TENANT_MEMBERSHIP_REQUIRED')) {
          return res.status(403).json({ error: 'No AI4 Contact Center tenant membership found' });
        }
        throw lifecycleError;
      }

      const result = lifecycle as any;
      if (!result?.lead || !result?.contact) throw new Error('AI4CC_LEAD_TRANSACTION_INVALID_RESPONSE');
      return res.status(201).json({
        lead: result.lead,
        contact: result.contact,
        activityId: result.activityId,
        auditId: result.auditId,
      });
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
