import type { NextApiRequest, NextApiResponse } from 'next';
import { apiErrorMessage, apiErrorStatus, requireAi4ccContext } from '@/lib/ai4ccServer';

const STAGES = new Set(['new','qualified','contacted','follow_up','opportunity','converted','lost','nurture']);
const NON_TERMINAL_STAGES = new Set(['new','qualified','contacted','follow_up','opportunity','nurture']);
const AGENT_STAGES = new Set(['new','qualified','contacted','follow_up','opportunity']);
const TERMINAL_STAGES = new Set(['converted','lost']);
const PRIORITIES = new Set(['low','normal','high','urgent']);
const PRIVILEGED_ROLES = new Set(['owner','admin','supervisor']);
const KNOWN_ROLES = new Set(['owner','admin','supervisor','operator','agent']);

type IdentifierType = 'email' | 'phone' | 'opaque';
type IdentifierClassification = {
  type: IdentifierType;
  value: string;
  email: string | null;
  phone: string | null;
};

type LeadMutation = {
  assignedAgentId?: string;
  pipelineStage?: string;
  priority?: string;
  score?: number;
  estimatedValue?: number;
  probability?: number;
  expectedCloseDate?: string | null;
  nextAction?: string | null;
  nextFollowUp?: string | null;
  lostReason?: string | null;
};

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function number(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function has(body: Record<string, unknown>, key: string) { return Object.prototype.hasOwnProperty.call(body, key); }

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

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function numericField(
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number | null,
  integerOnly: boolean,
): { ok: true; value?: number } | { ok: false; error: string } {
  if (!has(body, key)) return { ok: true };
  const value = Number(body[key]);
  if (!Number.isFinite(value)) return { ok: false, error: `${key} must be numeric` };
  if (integerOnly && !Number.isInteger(value)) return { ok: false, error: `${key} must be an integer` };
  if (value < min || (max !== null && value > max)) {
    return { ok: false, error: `${key} is outside the allowed range` };
  }
  return { ok: true, value };
}

function rpcFailure(error: any, res: NextApiResponse) {
  const message = String(error?.message || 'Lead lifecycle update failed');

  if (message.includes('AI4CC_LEAD_NOT_FOUND') || message.includes('AI4CC_ASSIGNED_AGENT_NOT_FOUND')) {
    return res.status(404).json({ error: 'Lead or assigned agent is not available in this tenant' });
  }

  if (
    message.includes('AI4CC_LEAD_OPERATION_FORBIDDEN') ||
    message.includes('AI4CC_LEAD_ASSIGNMENT_FORBIDDEN') ||
    message.includes('AI4CC_LEAD_FIELD_FORBIDDEN') ||
    message.includes('AI4CC_TERMINAL_TRANSITION_FORBIDDEN') ||
    message.includes('AI4CC_PIPELINE_TRANSITION_FORBIDDEN') ||
    message.includes('AI4CC_LOST_REASON_FORBIDDEN') ||
    message.includes('AI4CC_TENANT_MEMBERSHIP_REQUIRED')
  ) {
    return res.status(403).json({ error: 'This role is not authorized for the requested Lead operation' });
  }

  if (
    message.includes('AI4CC_LOST_REASON_REQUIRED') ||
    message.includes('AI4CC_LOST_REASON_STATE_CONFLICT') ||
    message.includes('AI4CC_LEAD_NO_MATERIAL_CHANGE')
  ) {
    return res.status(409).json({ error: 'The requested Lead lifecycle change conflicts with the current state' });
  }

  if (
    message.includes('AI4CC_LEAD_CHANGES_INVALID') ||
    message.includes('AI4CC_LEAD_CHANGES_EMPTY') ||
    message.includes('AI4CC_LEAD_FIELD_NOT_SUPPORTED') ||
    message.includes('AI4CC_PIPELINE_STAGE_INVALID') ||
    message.includes('AI4CC_ASSIGNED_AGENT_REQUIRED') ||
    message.includes('AI4CC_ASSIGNED_AGENT_INVALID')
  ) {
    return res.status(400).json({ error: 'The requested Lead mutation contains invalid input' });
  }

  return res.status(500).json({ error: 'Unable to update Lead lifecycle' });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { admin, tenantId, userId, role } = await requireAi4ccContext(req);

    if (req.method === 'GET') {
      const [{ data: leads, error: leadError }, { data: agents, error: agentError }] = await Promise.all([
        admin
          .from('ai4cc_leads')
          .select('*, contact:ai4cc_contacts(*), assigned_agent:ai4cc_agents!ai4cc_leads_assigned_agent_id_fkey(id,name,email,status), originating_queue:ai4cc_queues!ai4cc_leads_originating_queue_id_fkey(id,name,code), originating_agent:ai4cc_agents!ai4cc_leads_originating_agent_id_fkey(id,name,email,status)')
          .eq('tenant_id', tenantId)
          .order('updated_at', { ascending: false })
          .limit(250),
        admin
          .from('ai4cc_agents')
          .select('id,name,email,status,auth_user_id')
          .eq('tenant_id', tenantId)
          .order('name', { ascending: true }),
      ]);
      if (leadError) throw leadError;
      if (agentError) throw agentError;
      const actorAgentId = (agents ?? []).find((agent: any) => agent.auth_user_id === userId)?.id ?? null;
      return res.status(200).json({
        leads: leads ?? [],
        agents: (agents ?? []).map(({ auth_user_id: _authUserId, ...agent }: any) => agent),
        role,
        actorAgentId,
      });
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

      // CR-01A creation transaction remains frozen and authoritative.
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
      const body = (req.body ?? {}) as Record<string, unknown>;
      const leadId = text(body.leadId);
      if (!leadId || !validUuid(leadId)) return res.status(400).json({ error: 'A valid leadId is required' });
      if (!KNOWN_ROLES.has(role)) return res.status(403).json({ error: 'This membership role cannot mutate Leads' });

      const { data: lead, error: leadError } = await admin
        .from('ai4cc_leads')
        .select('id,contact_id,assigned_agent_id,pipeline_stage,status')
        .eq('tenant_id', tenantId)
        .eq('id', leadId)
        .maybeSingle();
      if (leadError) throw leadError;
      if (!lead) return res.status(404).json({ error: 'Lead not found' });

      const changes: LeadMutation = {};

      if (has(body, 'pipelineStage')) {
        const stage = text(body.pipelineStage);
        if (!STAGES.has(stage)) return res.status(400).json({ error: 'pipelineStage is invalid' });
        changes.pipelineStage = stage;
      }

      if (has(body, 'priority')) {
        const priority = text(body.priority);
        if (!PRIORITIES.has(priority)) return res.status(400).json({ error: 'priority is invalid' });
        changes.priority = priority;
      }

      const scoreResult = numericField(body, 'score', 0, 100, true);
      if (!scoreResult.ok) return res.status(400).json({ error: scoreResult.error });
      if (scoreResult.value !== undefined) changes.score = scoreResult.value;

      const probabilityResult = numericField(body, 'probability', 0, 100, true);
      if (!probabilityResult.ok) return res.status(400).json({ error: probabilityResult.error });
      if (probabilityResult.value !== undefined) changes.probability = probabilityResult.value;

      const valueResult = numericField(body, 'estimatedValue', 0, null, false);
      if (!valueResult.ok) return res.status(400).json({ error: valueResult.error });
      if (valueResult.value !== undefined) changes.estimatedValue = valueResult.value;

      if (has(body, 'expectedCloseDate')) {
        const raw = body.expectedCloseDate;
        if (raw === null || text(raw) === '') changes.expectedCloseDate = null;
        else {
          const value = text(raw);
          if (!validDateOnly(value)) return res.status(400).json({ error: 'expectedCloseDate must be YYYY-MM-DD' });
          changes.expectedCloseDate = value;
        }
      }

      if (has(body, 'nextAction')) {
        changes.nextAction = body.nextAction === null ? null : (text(body.nextAction) || null);
      }

      if (has(body, 'nextFollowUp')) {
        const raw = body.nextFollowUp;
        if (raw === null || text(raw) === '') changes.nextFollowUp = null;
        else {
          const parsed = new Date(String(raw));
          if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'nextFollowUp must be a valid timestamp' });
          changes.nextFollowUp = parsed.toISOString();
        }
      }

      if (has(body, 'lostReason')) {
        changes.lostReason = body.lostReason === null ? null : (text(body.lostReason) || null);
      }

      if (has(body, 'assignedAgentId')) {
        const assignedAgentId = text(body.assignedAgentId);
        if (!assignedAgentId || !validUuid(assignedAgentId)) {
          return res.status(400).json({ error: 'assignedAgentId must be a valid canonical agent ID' });
        }
        if (!PRIVILEGED_ROLES.has(role)) {
          return res.status(403).json({ error: 'This role cannot assign or reassign Leads' });
        }
        const { data: assignedAgent, error: assignedError } = await admin
          .from('ai4cc_agents')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('id', assignedAgentId)
          .maybeSingle();
        if (assignedError) throw assignedError;
        if (!assignedAgent) return res.status(404).json({ error: 'Assigned agent is not available in this tenant' });
        changes.assignedAgentId = assignedAgentId;
      }

      if (Object.keys(changes).length === 0) {
        return res.status(400).json({ error: 'At least one supported Lead field is required' });
      }

      const targetStage = changes.pipelineStage ?? lead.pipeline_stage;

      if (targetStage === 'lost' && !text(changes.lostReason ?? (body.lostReason as unknown))) {
        if (lead.pipeline_stage !== 'lost') {
          return res.status(409).json({ error: 'A meaningful lost reason is required before marking a Lead lost' });
        }
      }

      if (changes.lostReason !== undefined && targetStage !== 'lost') {
        return res.status(409).json({ error: 'lostReason may only be changed while the Lead is in the lost state' });
      }

      if (role === 'operator') {
        if (TERMINAL_STAGES.has(lead.pipeline_stage)) {
          return res.status(403).json({ error: 'Operators cannot mutate a terminal Lead' });
        }
        if (changes.assignedAgentId !== undefined || changes.lostReason !== undefined) {
          return res.status(403).json({ error: 'Operators cannot perform assignment or loss disposition changes' });
        }
        if (changes.pipelineStage && !NON_TERMINAL_STAGES.has(changes.pipelineStage)) {
          return res.status(403).json({ error: 'Operators cannot enter a terminal Lead state' });
        }
      }

      if (role === 'agent') {
        const { data: actorAgent, error: actorAgentError } = await admin
          .from('ai4cc_agents')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('auth_user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (actorAgentError) throw actorAgentError;
        if (!actorAgent || lead.assigned_agent_id !== actorAgent.id) {
          return res.status(403).json({ error: 'Agents may edit only Leads assigned to their canonical agent record' });
        }
        if (!AGENT_STAGES.has(lead.pipeline_stage)) {
          return res.status(403).json({ error: 'Agents cannot mutate nurture or terminal Leads' });
        }
        if (
          changes.assignedAgentId !== undefined ||
          changes.estimatedValue !== undefined ||
          changes.probability !== undefined ||
          changes.expectedCloseDate !== undefined ||
          changes.lostReason !== undefined
        ) {
          return res.status(403).json({ error: 'Agents cannot change assignment or restricted commercial fields' });
        }
        if (changes.pipelineStage && !AGENT_STAGES.has(changes.pipelineStage)) {
          return res.status(403).json({ error: 'Agents cannot enter nurture or terminal Lead stages' });
        }
      }

      const { data: lifecycle, error: lifecycleError } = await admin.rpc('ai4cc_update_lead_lifecycle', {
        p_tenant_id: tenantId,
        p_actor_user_id: userId,
        p_lead_id: leadId,
        p_changes: changes,
      });

      if (lifecycleError) return rpcFailure(lifecycleError, res);

      const result = lifecycle as any;
      if (!result?.lead) return res.status(500).json({ error: 'Lead lifecycle transaction returned an invalid response' });

      return res.status(200).json({
        lead: result.lead,
        activityIds: result.activityIds ?? [],
        auditIds: result.auditIds ?? [],
        changedFields: result.changedFields ?? [],
      });
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
