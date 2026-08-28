import type { NextApiRequest, NextApiResponse } from 'next';
import { apiErrorMessage, apiErrorStatus, requireAi4ccContext } from '@/lib/ai4ccServer';

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function validUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function normalizePhone(value: string | null | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const { admin, tenantId } = await requireAi4ccContext(req);
    const contactId = text(req.query.contactId);

    if (!contactId) {
      const { data: contacts, error } = await admin
        .from('ai4cc_contacts')
        .select('id,first_name,last_name,display_name,company_name,email,phone,preferred_channel,lead_source,lead_score,priority,sms_consent,email_consent,do_not_contact,tags,metadata,created_at,updated_at')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return res.status(200).json({ contacts: contacts ?? [] });
    }

    if (!validUuid(contactId)) return res.status(400).json({ error: 'A valid contactId is required' });

    const { data: contact, error: contactError } = await admin
      .from('ai4cc_contacts')
      .select('id,first_name,last_name,display_name,company_name,email,phone,preferred_channel,lead_source,lead_score,priority,sms_consent,email_consent,do_not_contact,tags,metadata,created_at,updated_at')
      .eq('tenant_id', tenantId)
      .eq('id', contactId)
      .maybeSingle();
    if (contactError) throw contactError;
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const [leadResult, activityResult, taskResult] = await Promise.all([
      admin
        .from('ai4cc_leads')
        .select('id,title,service_interest,pipeline_stage,status,priority,score,estimated_value,probability,expected_close_date,assigned_agent_id,next_action,next_follow_up,last_contacted_at,converted_at,lost_reason,originating_interaction_id,originating_channel,updated_at,assigned_agent:ai4cc_agents!ai4cc_leads_assigned_agent_id_fkey(id,name,email,status)')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .order('updated_at', { ascending: false }),
      admin
        .from('ai4cc_lead_activities')
        .select('id,lead_id,interaction_id,activity_type,direction,subject,body,outcome,actor_agent_id,created_at,actor_agent:ai4cc_agents(id,name,email,status)')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(250),
      admin
        .from('ai4cc_lead_tasks')
        .select('id,lead_id,title,description,task_type,due_at,priority,status,assigned_agent_id,completed_at,updated_at,assigned_agent:ai4cc_agents(id,name,email,status)')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .order('updated_at', { ascending: false })
        .limit(250),
    ]);

    const relatedError = leadResult.error || activityResult.error || taskResult.error;
    if (relatedError) throw relatedError;

    const leads = leadResult.data ?? [];
    const originIds = leads.map((lead: any) => lead.originating_interaction_id).filter(Boolean);
    const interactionMap = new Map<string, any>();

    if (originIds.length) {
      const { data, error } = await admin
        .from('ai4cc_interactions')
        .select('id,channel,direction,external_id,customer_identifier,status,started_at,ended_at,metadata,queue_id,agent_id')
        .eq('tenant_id', tenantId)
        .in('id', originIds)
        .order('started_at', { ascending: false });
      if (error) throw error;
      for (const row of data ?? []) interactionMap.set(row.id, row);
    }

    const identifiers = new Set<string>();
    if (contact.email) identifiers.add(String(contact.email).trim().toLowerCase());
    const normalizedPhone = normalizePhone(contact.phone);
    if (normalizedPhone) identifiers.add(normalizedPhone);

    for (const identifier of identifiers) {
      const query = admin
        .from('ai4cc_interactions')
        .select('id,channel,direction,external_id,customer_identifier,status,started_at,ended_at,metadata,queue_id,agent_id')
        .eq('tenant_id', tenantId)
        .order('started_at', { ascending: false })
        .limit(100);
      const result = identifier.includes('@')
        ? await query.ilike('customer_identifier', identifier)
        : await query.eq('customer_identifier', identifier);
      if (result.error) throw result.error;
      for (const row of result.data ?? []) interactionMap.set(row.id, row);
    }

    const interactions = [...interactionMap.values()].sort((a, b) =>
      new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime()
    );

    const queueIds = [...new Set(interactions.map((row: any) => row.queue_id).filter(Boolean))];
    const agentIds = [...new Set(interactions.map((row: any) => row.agent_id).filter(Boolean))];
    const [queueResult, agentResult] = await Promise.all([
      queueIds.length
        ? admin.from('ai4cc_queues').select('id,name,code').eq('tenant_id', tenantId).in('id', queueIds)
        : Promise.resolve({ data: [], error: null }),
      agentIds.length
        ? admin.from('ai4cc_agents').select('id,name,email,status').eq('tenant_id', tenantId).in('id', agentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (queueResult.error || agentResult.error) throw queueResult.error || agentResult.error;

    const queues = new Map((queueResult.data ?? []).map((row: any) => [row.id, row]));
    const agents = new Map((agentResult.data ?? []).map((row: any) => [row.id, row]));
    const hydratedInteractions = interactions.map((row: any) => ({
      ...row,
      queue: row.queue_id ? queues.get(row.queue_id) ?? null : null,
      agent: row.agent_id ? agents.get(row.agent_id) ?? null : null,
    }));

    const openLeads = leads.filter((lead: any) => !['converted', 'lost'].includes(lead.pipeline_stage));
    const openTasks = (taskResult.data ?? []).filter((task: any) => !['completed', 'cancelled'].includes(task.status));
    const pipelineValue = openLeads.reduce((sum: number, lead: any) => sum + Number(lead.estimated_value || 0), 0);
    const weightedValue = openLeads.reduce((sum: number, lead: any) => sum + (Number(lead.estimated_value || 0) * Number(lead.probability || 0) / 100), 0);
    const channels = hydratedInteractions.reduce((acc: Record<string, number>, row: any) => {
      const key = String(row.channel || 'unknown').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      contact,
      leads,
      activities: activityResult.data ?? [],
      tasks: taskResult.data ?? [],
      interactions: hydratedInteractions,
      summary: {
        openLeads: openLeads.length,
        openTasks: openTasks.length,
        pipelineValue,
        weightedValue,
        interactionCount: hydratedInteractions.length,
        lastInteractionAt: hydratedInteractions[0]?.started_at ?? null,
        channels,
      },
    });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
