-- AI4CC CR-01B Package 02 — Activity + Task Operations
-- Canonical Lead, Contact, Agent, Tenant, Activity, Task, and Audit authorities only.
-- Manual refresh remains the UI operating model.

create or replace function public.ai4cc_record_lead_activity(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_lead_id uuid,
  p_activity_type text,
  p_direction text,
  p_subject text,
  p_body text default null,
  p_outcome text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_role text;
  v_actor_agent_id uuid;
  v_lead public.ai4cc_leads%rowtype;
  v_activity public.ai4cc_lead_activities%rowtype;
  v_audit_id uuid;
begin
  select m.role into v_role
  from public.ai4cc_tenant_members m
  where m.tenant_id = p_tenant_id and m.user_id = p_actor_user_id
  limit 1;

  if v_role is null or v_role not in ('owner','admin','supervisor','operator','agent') then
    raise exception using errcode = '42501', message = 'AI4CC_LEAD_ACTIVITY_FORBIDDEN';
  end if;

  select * into v_lead
  from public.ai4cc_leads l
  where l.id = p_lead_id and l.tenant_id = p_tenant_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'AI4CC_LEAD_NOT_FOUND';
  end if;

  select a.id into v_actor_agent_id
  from public.ai4cc_agents a
  where a.tenant_id = p_tenant_id and a.auth_user_id = p_actor_user_id
  order by a.created_at asc
  limit 1;

  if v_role = 'agent' and (v_actor_agent_id is null or v_lead.assigned_agent_id is distinct from v_actor_agent_id) then
    raise exception using errcode = '42501', message = 'AI4CC_LEAD_ACTIVITY_FORBIDDEN';
  end if;

  p_activity_type := nullif(btrim(p_activity_type), '');
  p_direction := nullif(btrim(p_direction), '');
  p_subject := nullif(btrim(p_subject), '');
  p_body := nullif(btrim(p_body), '');
  p_outcome := nullif(btrim(p_outcome), '');

  if p_activity_type is null or length(p_activity_type) > 80 then
    raise exception using errcode = '22023', message = 'AI4CC_ACTIVITY_TYPE_INVALID';
  end if;
  if p_direction is null or p_direction not in ('internal','inbound','outbound') then
    raise exception using errcode = '22023', message = 'AI4CC_ACTIVITY_DIRECTION_INVALID';
  end if;
  if p_subject is null or length(p_subject) > 240 then
    raise exception using errcode = '22023', message = 'AI4CC_ACTIVITY_SUBJECT_INVALID';
  end if;
  if p_body is not null and length(p_body) > 8000 then
    raise exception using errcode = '22023', message = 'AI4CC_ACTIVITY_BODY_INVALID';
  end if;
  if p_outcome is not null and length(p_outcome) > 500 then
    raise exception using errcode = '22023', message = 'AI4CC_ACTIVITY_OUTCOME_INVALID';
  end if;

  insert into public.ai4cc_lead_activities (
    tenant_id, lead_id, contact_id, interaction_id, activity_type, direction,
    subject, body, outcome, actor_user_id, actor_agent_id, metadata
  ) values (
    p_tenant_id, v_lead.id, v_lead.contact_id, v_lead.originating_interaction_id,
    p_activity_type, p_direction, p_subject, p_body, p_outcome,
    p_actor_user_id, v_actor_agent_id,
    jsonb_build_object('source','cr01b_package02','actorRole',v_role)
  ) returning * into v_activity;

  insert into public.ai4cc_audit_logs (
    tenant_id, actor_user_id, action, resource_type, resource_id, payload
  ) values (
    p_tenant_id, p_actor_user_id, 'lead.activity_recorded', 'ai4cc_lead_activity', v_activity.id::text,
    jsonb_build_object(
      'leadId', v_lead.id,
      'contactId', v_lead.contact_id,
      'activityType', v_activity.activity_type,
      'direction', v_activity.direction,
      'actorRole', v_role
    )
  ) returning id into v_audit_id;

  return jsonb_build_object('activity',to_jsonb(v_activity),'auditId',v_audit_id,'actorRole',v_role);
end;
$$;

create or replace function public.ai4cc_manage_lead_task(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_lead_id uuid,
  p_task_id uuid,
  p_operation text,
  p_changes jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_role text;
  v_actor_agent_id uuid;
  v_lead public.ai4cc_leads%rowtype;
  v_task public.ai4cc_lead_tasks%rowtype;
  v_before public.ai4cc_lead_tasks%rowtype;
  v_assigned_agent_id uuid;
  v_title text;
  v_description text;
  v_task_type text;
  v_due_at timestamptz;
  v_priority text;
  v_status text;
  v_audit_action text;
  v_audit_id uuid;
  v_now timestamptz := now();
begin
  select m.role into v_role
  from public.ai4cc_tenant_members m
  where m.tenant_id = p_tenant_id and m.user_id = p_actor_user_id
  limit 1;

  if v_role is null or v_role not in ('owner','admin','supervisor','operator','agent') then
    raise exception using errcode = '42501', message = 'AI4CC_LEAD_TASK_FORBIDDEN';
  end if;

  select * into v_lead
  from public.ai4cc_leads l
  where l.id = p_lead_id and l.tenant_id = p_tenant_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'AI4CC_LEAD_NOT_FOUND';
  end if;

  select a.id into v_actor_agent_id
  from public.ai4cc_agents a
  where a.tenant_id = p_tenant_id and a.auth_user_id = p_actor_user_id
  order by a.created_at asc
  limit 1;

  if v_role = 'agent' and (v_actor_agent_id is null or v_lead.assigned_agent_id is distinct from v_actor_agent_id) then
    raise exception using errcode = '42501', message = 'AI4CC_LEAD_TASK_FORBIDDEN';
  end if;

  p_operation := lower(nullif(btrim(p_operation),''));
  if p_operation not in ('create','update') then
    raise exception using errcode = '22023', message = 'AI4CC_TASK_OPERATION_INVALID';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception using errcode = '22023', message = 'AI4CC_TASK_CHANGES_INVALID';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_changes) k(key)
    where k.key not in ('title','description','taskType','dueAt','priority','status','assignedAgentId')
  ) then
    raise exception using errcode = '22023', message = 'AI4CC_TASK_FIELD_NOT_SUPPORTED';
  end if;

  if p_operation = 'create' then
    v_title := nullif(btrim(p_changes->>'title'),'');
    if v_title is null or length(v_title) > 240 then
      raise exception using errcode = '22023', message = 'AI4CC_TASK_TITLE_INVALID';
    end if;
    v_description := nullif(btrim(p_changes->>'description'),'');
    v_task_type := coalesce(nullif(btrim(p_changes->>'taskType'),''),'follow_up');
    v_priority := coalesce(nullif(btrim(p_changes->>'priority'),''),'normal');
    v_status := 'pending';
    if v_priority not in ('low','normal','high','urgent') then
      raise exception using errcode = '22023', message = 'AI4CC_TASK_PRIORITY_INVALID';
    end if;
    if p_changes ? 'dueAt' and nullif(p_changes->>'dueAt','') is not null then
      v_due_at := (p_changes->>'dueAt')::timestamptz;
    end if;

    if p_changes ? 'assignedAgentId' and nullif(p_changes->>'assignedAgentId','') is not null then
      v_assigned_agent_id := (p_changes->>'assignedAgentId')::uuid;
    else
      v_assigned_agent_id := coalesce(v_lead.assigned_agent_id, v_actor_agent_id);
    end if;

    if v_role = 'agent' and v_assigned_agent_id is distinct from v_actor_agent_id then
      raise exception using errcode = '42501', message = 'AI4CC_TASK_ASSIGNMENT_FORBIDDEN';
    end if;

    if v_assigned_agent_id is not null and not exists (
      select 1 from public.ai4cc_agents a
      where a.id = v_assigned_agent_id and a.tenant_id = p_tenant_id
    ) then
      raise exception using errcode = 'P0002', message = 'AI4CC_ASSIGNED_AGENT_NOT_FOUND';
    end if;

    insert into public.ai4cc_lead_tasks (
      tenant_id, lead_id, contact_id, assigned_agent_id, title, description,
      task_type, due_at, priority, status, metadata
    ) values (
      p_tenant_id, v_lead.id, v_lead.contact_id, v_assigned_agent_id, v_title,
      v_description, v_task_type, v_due_at, v_priority, 'pending',
      jsonb_build_object('source','cr01b_package02')
    ) returning * into v_task;

    v_audit_action := 'lead.task_created';
  else
    if p_task_id is null then
      raise exception using errcode = '22023', message = 'AI4CC_TASK_ID_REQUIRED';
    end if;

    select * into v_before
    from public.ai4cc_lead_tasks t
    where t.id = p_task_id and t.tenant_id = p_tenant_id and t.lead_id = p_lead_id
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'AI4CC_TASK_NOT_FOUND';
    end if;

    if v_role = 'agent' and v_before.assigned_agent_id is distinct from v_actor_agent_id then
      raise exception using errcode = '42501', message = 'AI4CC_LEAD_TASK_FORBIDDEN';
    end if;

    v_title := case when p_changes ? 'title' then nullif(btrim(p_changes->>'title'),'') else v_before.title end;
    if v_title is null or length(v_title) > 240 then
      raise exception using errcode = '22023', message = 'AI4CC_TASK_TITLE_INVALID';
    end if;
    v_description := case when p_changes ? 'description' then nullif(btrim(p_changes->>'description'),'') else v_before.description end;
    v_task_type := case when p_changes ? 'taskType' then coalesce(nullif(btrim(p_changes->>'taskType'),''),'follow_up') else v_before.task_type end;
    v_priority := case when p_changes ? 'priority' then p_changes->>'priority' else v_before.priority end;
    v_status := case when p_changes ? 'status' then p_changes->>'status' else v_before.status end;
    v_due_at := case when p_changes ? 'dueAt' then nullif(p_changes->>'dueAt','')::timestamptz else v_before.due_at end;
    v_assigned_agent_id := case
      when p_changes ? 'assignedAgentId' and nullif(p_changes->>'assignedAgentId','') is not null then (p_changes->>'assignedAgentId')::uuid
      when p_changes ? 'assignedAgentId' then null
      else v_before.assigned_agent_id
    end;

    if v_priority not in ('low','normal','high','urgent') then
      raise exception using errcode = '22023', message = 'AI4CC_TASK_PRIORITY_INVALID';
    end if;
    if v_status not in ('pending','in_progress','completed','cancelled') then
      raise exception using errcode = '22023', message = 'AI4CC_TASK_STATUS_INVALID';
    end if;
    if v_role = 'agent' and v_assigned_agent_id is distinct from v_actor_agent_id then
      raise exception using errcode = '42501', message = 'AI4CC_TASK_ASSIGNMENT_FORBIDDEN';
    end if;
    if v_assigned_agent_id is not null and not exists (
      select 1 from public.ai4cc_agents a where a.id = v_assigned_agent_id and a.tenant_id = p_tenant_id
    ) then
      raise exception using errcode = 'P0002', message = 'AI4CC_ASSIGNED_AGENT_NOT_FOUND';
    end if;

    update public.ai4cc_lead_tasks
    set title = v_title,
        description = v_description,
        task_type = v_task_type,
        due_at = v_due_at,
        priority = v_priority,
        status = v_status,
        assigned_agent_id = v_assigned_agent_id,
        completed_at = case when v_status = 'completed' then coalesce(v_before.completed_at,v_now) else null end,
        completed_by = case when v_status = 'completed' then coalesce(v_before.completed_by,p_actor_user_id) else null end,
        updated_at = v_now
    where id = v_before.id
    returning * into v_task;

    if to_jsonb(v_before) - array['updated_at']::text[] = to_jsonb(v_task) - array['updated_at']::text[] then
      raise exception using errcode = 'P0001', message = 'AI4CC_TASK_NO_MATERIAL_CHANGE';
    end if;

    v_audit_action := case
      when v_before.status is distinct from v_task.status and v_task.status = 'completed' then 'lead.task_completed'
      when v_before.status is distinct from v_task.status and v_task.status = 'cancelled' then 'lead.task_cancelled'
      else 'lead.task_updated'
    end;
  end if;

  insert into public.ai4cc_lead_activities (
    tenant_id, lead_id, contact_id, activity_type, direction, subject, body,
    actor_user_id, actor_agent_id, metadata
  ) values (
    p_tenant_id, v_lead.id, v_lead.contact_id,
    case v_audit_action
      when 'lead.task_created' then 'task_created'
      when 'lead.task_completed' then 'task_completed'
      when 'lead.task_cancelled' then 'task_cancelled'
      else 'task_updated'
    end,
    'internal',
    case v_audit_action
      when 'lead.task_created' then 'Lead task created'
      when 'lead.task_completed' then 'Lead task completed'
      when 'lead.task_cancelled' then 'Lead task cancelled'
      else 'Lead task updated'
    end,
    v_task.title,
    p_actor_user_id, v_actor_agent_id,
    jsonb_build_object('taskId',v_task.id,'taskStatus',v_task.status,'actorRole',v_role,'source','cr01b_package02')
  );

  insert into public.ai4cc_audit_logs (
    tenant_id, actor_user_id, action, resource_type, resource_id, payload
  ) values (
    p_tenant_id, p_actor_user_id, v_audit_action, 'ai4cc_lead_task', v_task.id::text,
    jsonb_build_object(
      'leadId',v_lead.id,
      'contactId',v_lead.contact_id,
      'assignedAgentId',v_task.assigned_agent_id,
      'status',v_task.status,
      'priority',v_task.priority,
      'dueAt',v_task.due_at,
      'actorRole',v_role
    )
  ) returning id into v_audit_id;

  return jsonb_build_object('task',to_jsonb(v_task),'auditId',v_audit_id,'actorRole',v_role);
end;
$$;

revoke all on function public.ai4cc_record_lead_activity(uuid,uuid,uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.ai4cc_record_lead_activity(uuid,uuid,uuid,text,text,text,text,text) to service_role;

revoke all on function public.ai4cc_manage_lead_task(uuid,uuid,uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.ai4cc_manage_lead_task(uuid,uuid,uuid,uuid,text,jsonb) to service_role;

-- Close direct authenticated task mutation. Reads remain tenant-scoped.
drop policy if exists ai4cc_lead_tasks_manage_member on public.ai4cc_lead_tasks;
revoke insert, update, delete, truncate on table public.ai4cc_lead_tasks from anon, authenticated;

comment on function public.ai4cc_record_lead_activity(uuid,uuid,uuid,text,text,text,text,text) is
  'CR-01B Package 02 canonical Lead activity recorder with tenant/RBAC and Audit evidence.';
comment on function public.ai4cc_manage_lead_task(uuid,uuid,uuid,uuid,text,jsonb) is
  'CR-01B Package 02 canonical Lead task mutation authority with tenant/RBAC, Activity, and Audit evidence.';
