import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext } from '@/lib/ai4ccServer';

const ACTIVITY_DIRECTIONS = new Set(['internal','inbound','outbound']);
const TASK_PRIORITIES = new Set(['low','normal','high','urgent']);
const TASK_STATUSES = new Set(['pending','in_progress','completed','cancelled']);

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function rpcError(message: string, res: NextApiResponse) {
  if (message.includes('NOT_FOUND')) return res.status(404).json({ error: 'Lead, task, or assigned agent was not found in this tenant' });
  if (message.includes('FORBIDDEN')) return res.status(403).json({ error: 'Your role or assignment is not authorized for this operation' });
  if (message.includes('NO_MATERIAL_CHANGE')) return res.status(409).json({ error: 'The requested task update does not materially change the current record' });
  if (message.includes('INVALID') || message.includes('REQUIRED') || message.includes('NOT_SUPPORTED')) {
    return res.status(400).json({ error: 'The Lead operation contains invalid input' });
  }
  return res.status(500).json({ error: 'Unable to complete Lead operation' });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { admin, tenantId, userId, role } = await requireAi4ccContext(req);
    const leadId = text(req.method === 'GET' ? req.query.leadId : req.body?.leadId);
    if (!leadId || !validUuid(leadId)) return res.status(400).json({ error: 'A valid leadId is required' });

    const { data: lead, error: leadError } = await admin
      .from('ai4cc_leads')
      .select('id,contact_id,assigned_agent_id,title,pipeline_stage,status')
      .eq('tenant_id', tenantId)
      .eq('id', leadId)
      .maybeSingle();
    if (leadError) throw leadError;
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (req.method === 'GET') {
      const [{ data: activities, error: activityError }, { data: tasks, error: taskError }, { data: agents, error: agentError }] = await Promise.all([
        admin
          .from('ai4cc_lead_activities')
          .select('id,lead_id,activity_type,direction,subject,body,outcome,actor_user_id,actor_agent_id,metadata,created_at,actor_agent:ai4cc_agents!ai4cc_lead_activities_actor_agent_id_fkey(id,name,email,status)')
          .eq('tenant_id', tenantId)
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(250),
        admin
          .from('ai4cc_lead_tasks')
          .select('id,lead_id,contact_id,assigned_agent_id,title,description,task_type,due_at,priority,status,completed_at,completed_by,metadata,created_at,updated_at,assigned_agent:ai4cc_agents!ai4cc_lead_tasks_assigned_agent_id_fkey(id,name,email,status)')
          .eq('tenant_id', tenantId)
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(250),
        admin
          .from('ai4cc_agents')
          .select('id,name,email,status,auth_user_id')
          .eq('tenant_id', tenantId)
          .order('name', { ascending: true }),
      ]);
      if (activityError) throw activityError;
      if (taskError) throw taskError;
      if (agentError) throw agentError;
      const actorAgentId = (agents ?? []).find((agent: any) => agent.auth_user_id === userId)?.id ?? null;
      return res.status(200).json({
        lead,
        activities: activities ?? [],
        tasks: tasks ?? [],
        agents: (agents ?? []).map(({ auth_user_id: _authUserId, ...agent }: any) => agent),
        role,
        actorAgentId,
      });
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const operation = text(body.operation);

      if (operation === 'record_activity') {
        const activityType = text(body.activityType);
        const direction = text(body.direction) || 'internal';
        const subject = text(body.subject);
        const activityBody = body.body == null ? null : text(body.body);
        const outcome = body.outcome == null ? null : text(body.outcome);
        if (!activityType || activityType.length > 80) return res.status(400).json({ error: 'activityType is required' });
        if (!ACTIVITY_DIRECTIONS.has(direction)) return res.status(400).json({ error: 'direction is invalid' });
        if (!subject || subject.length > 240) return res.status(400).json({ error: 'subject is required' });

        const { data, error } = await admin.rpc('ai4cc_record_lead_activity', {
          p_tenant_id: tenantId,
          p_actor_user_id: userId,
          p_lead_id: leadId,
          p_activity_type: activityType,
          p_direction: direction,
          p_subject: subject,
          p_body: activityBody || null,
          p_outcome: outcome || null,
        });
        if (error) return rpcError(String(error.message || ''), res);
        return res.status(201).json(data);
      }

      if (operation === 'create_task' || operation === 'update_task') {
        const taskId = operation === 'update_task' ? text(body.taskId) : '';
        if (operation === 'update_task' && (!taskId || !validUuid(taskId))) {
          return res.status(400).json({ error: 'A valid taskId is required' });
        }

        const changes: Record<string, unknown> = {};
        const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
        if (has('title')) changes.title = text(body.title);
        if (has('description')) changes.description = body.description == null ? null : text(body.description);
        if (has('taskType')) changes.taskType = text(body.taskType) || 'follow_up';
        if (has('dueAt')) {
          if (body.dueAt == null || text(body.dueAt) === '') changes.dueAt = null;
          else {
            const due = new Date(String(body.dueAt));
            if (Number.isNaN(due.getTime())) return res.status(400).json({ error: 'dueAt must be a valid timestamp' });
            changes.dueAt = due.toISOString();
          }
        }
        if (has('priority')) {
          const priority = text(body.priority);
          if (!TASK_PRIORITIES.has(priority)) return res.status(400).json({ error: 'priority is invalid' });
          changes.priority = priority;
        }
        if (has('status')) {
          const status = text(body.status);
          if (!TASK_STATUSES.has(status)) return res.status(400).json({ error: 'status is invalid' });
          changes.status = status;
        }
        if (has('assignedAgentId')) {
          const assignedAgentId = text(body.assignedAgentId);
          if (assignedAgentId && !validUuid(assignedAgentId)) return res.status(400).json({ error: 'assignedAgentId must be canonical UUID or empty' });
          changes.assignedAgentId = assignedAgentId || null;
        }
        if (operation === 'create_task' && !text(body.title)) return res.status(400).json({ error: 'title is required' });

        const { data, error } = await admin.rpc('ai4cc_manage_lead_task', {
          p_tenant_id: tenantId,
          p_actor_user_id: userId,
          p_lead_id: leadId,
          p_task_id: taskId || null,
          p_operation: operation === 'create_task' ? 'create' : 'update',
          p_changes: changes,
        });
        if (error) return rpcError(String(error.message || ''), res);
        return res.status(operation === 'create_task' ? 201 : 200).json(data);
      }

      return res.status(400).json({ error: 'Unsupported Lead operation' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('lead-operations error', error);
    return res.status(500).json({ error: 'Unable to complete Lead operation' });
  }
}
