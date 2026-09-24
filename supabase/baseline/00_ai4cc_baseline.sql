-- AI4CC baseline schema (tenant control plane + contact-center core).
-- Generated 2026-09-24 from the production project's catalog (ai4cc_* objects only), for
-- bootstrapping NEW Supabase projects. It already includes everything the older migrations in
-- ../migrations created, so on a new project apply ONLY this file (not those migrations).
-- Requires extensions: pgcrypto, citext (Supabase provides both).

create extension if not exists pgcrypto;
create extension if not exists citext;

CREATE OR REPLACE FUNCTION public.ai4cc_create_lead_from_interaction(p_tenant_id uuid, p_actor_user_id uuid, p_interaction_id uuid, p_identifier_type text, p_identifier_value text, p_email text, p_phone text, p_contact_name text, p_company_name text, p_title text, p_service_interest text, p_description text, p_pipeline_stage text, p_priority text, p_score integer, p_estimated_value numeric, p_probability integer, p_next_action text, p_next_follow_up timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_interaction public.ai4cc_interactions%rowtype;
  v_contact public.ai4cc_contacts%rowtype;
  v_lead public.ai4cc_leads%rowtype;
  v_activity public.ai4cc_lead_activities%rowtype;
  v_audit public.ai4cc_audit_logs%rowtype;
  v_intent text;
begin
  if not exists (
    select 1
    from public.ai4cc_tenant_members m
    where m.tenant_id = p_tenant_id
      and m.user_id = p_actor_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'AI4CC_TENANT_MEMBERSHIP_REQUIRED';
  end if;

  select *
  into v_interaction
  from public.ai4cc_interactions i
  where i.id = p_interaction_id
    and i.tenant_id = p_tenant_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'AI4CC_INTERACTION_NOT_FOUND';
  end if;

  if v_interaction.status <> 'completed' then
    raise exception using
      errcode = 'P0001',
      message = 'AI4CC_INTERACTION_NOT_COMPLETED';
  end if;

  if p_identifier_type not in ('email', 'phone', 'opaque') then
    raise exception using
      errcode = '22023',
      message = 'AI4CC_IDENTIFIER_TYPE_INVALID';
  end if;

  if p_identifier_type = 'email' and p_email is not null then
    select *
    into v_contact
    from public.ai4cc_contacts c
    where c.tenant_id = p_tenant_id
      and c.email is not null
      and lower(c.email) = lower(p_email)
    order by c.created_at asc
    limit 1;
  elsif p_identifier_type = 'phone' and p_phone is not null then
    select *
    into v_contact
    from public.ai4cc_contacts c
    where c.tenant_id = p_tenant_id
      and c.phone = p_phone
    order by c.created_at asc
    limit 1;
  end if;

  if v_contact.id is null then
    insert into public.ai4cc_contacts (
      tenant_id,
      display_name,
      company_name,
      email,
      phone,
      preferred_channel,
      lead_source,
      lead_score,
      priority,
      metadata
    )
    values (
      p_tenant_id,
      coalesce(nullif(p_contact_name, ''), nullif(p_identifier_value, ''), 'Unknown contact'),
      nullif(p_company_name, ''),
      case when p_identifier_type = 'email' then nullif(p_email, '') else null end,
      case when p_identifier_type = 'phone' then nullif(p_phone, '') else null end,
      v_interaction.channel,
      'ai4cc_' || v_interaction.channel,
      greatest(0, least(100, coalesce(p_score, 50))),
      coalesce(nullif(p_priority, ''), 'normal'),
      jsonb_build_object(
        'originatingInteractionId', p_interaction_id,
        'customerIdentifier', nullif(p_identifier_value, ''),
        'identifierType', p_identifier_type
      )
    )
    returning * into v_contact;
  end if;

  v_intent := coalesce(
    nullif(v_interaction.metadata ->> 'detectedIntent', ''),
    nullif(v_interaction.metadata ->> 'routingIntent', '')
  );

  insert into public.ai4cc_leads (
    tenant_id,
    contact_id,
    originating_interaction_id,
    originating_channel,
    originating_queue_id,
    originating_agent_id,
    assigned_agent_id,
    title,
    service_interest,
    description,
    pipeline_stage,
    priority,
    score,
    estimated_value,
    probability,
    next_action,
    next_follow_up,
    metadata
  )
  values (
    p_tenant_id,
    v_contact.id,
    v_interaction.id,
    v_interaction.channel,
    v_interaction.queue_id,
    v_interaction.agent_id,
    v_interaction.agent_id,
    coalesce(nullif(p_title, ''), coalesce(replace(v_intent, '_', ' '), v_interaction.channel) || ' lead'),
    coalesce(nullif(p_service_interest, ''), v_intent),
    coalesce(nullif(p_description, ''), 'Lead created from canonical AI4CC ' || v_interaction.channel || ' interaction.'),
    coalesce(nullif(p_pipeline_stage, ''), 'new'),
    coalesce(nullif(p_priority, ''), 'normal'),
    greatest(0, least(100, coalesce(p_score, 50))),
    greatest(0, coalesce(p_estimated_value, 0)),
    greatest(0, least(100, coalesce(p_probability, 0))),
    coalesce(nullif(p_next_action, ''), 'Review interaction and determine follow-up.'),
    p_next_follow_up,
    jsonb_build_object(
      'source', 'ai4cc_interaction',
      'originatingInteractionStartedAt', v_interaction.started_at
    )
  )
  returning * into v_lead;

  insert into public.ai4cc_lead_activities (
    tenant_id,
    lead_id,
    contact_id,
    interaction_id,
    activity_type,
    direction,
    subject,
    actor_user_id,
    actor_agent_id,
    metadata
  )
  values (
    p_tenant_id,
    v_lead.id,
    v_contact.id,
    v_interaction.id,
    'lead_created',
    'internal',
    'Lead created from AI4CC interaction',
    p_actor_user_id,
    v_interaction.agent_id,
    jsonb_build_object('channel', v_interaction.channel, 'intent', v_intent)
  )
  returning * into v_activity;

  insert into public.ai4cc_audit_logs (
    tenant_id,
    actor_user_id,
    action,
    resource_type,
    resource_id,
    payload
  )
  values (
    p_tenant_id,
    p_actor_user_id,
    'lead.created_from_interaction',
    'ai4cc_lead',
    v_lead.id::text,
    jsonb_build_object(
      'contactId', v_contact.id,
      'interactionId', v_interaction.id,
      'channel', v_interaction.channel,
      'intent', v_intent,
      'identifierType', p_identifier_type
    )
  )
  returning * into v_audit;

  return jsonb_build_object(
    'lead', to_jsonb(v_lead),
    'contact', to_jsonb(v_contact),
    'activityId', v_activity.id,
    'auditId', v_audit.id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai4cc_manage_lead_task(p_tenant_id uuid, p_actor_user_id uuid, p_lead_id uuid, p_task_id uuid, p_operation text, p_changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.ai4cc_record_lead_activity(p_tenant_id uuid, p_actor_user_id uuid, p_lead_id uuid, p_activity_type text, p_direction text, p_subject text, p_body text DEFAULT NULL::text, p_outcome text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.ai4cc_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai4cc_update_lead_lifecycle(p_tenant_id uuid, p_actor_user_id uuid, p_lead_id uuid, p_changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_actor_agent_id uuid;
  v_before public.ai4cc_leads%rowtype;
  v_after public.ai4cc_leads%rowtype;
  v_requested_stage text;
  v_requested_agent_id uuid;
  v_requested_lost_reason text;
  v_changes jsonb := '{}'::jsonb;
  v_changed_fields jsonb := '[]'::jsonb;
  v_common_metadata jsonb;
  v_activity_ids uuid[] := '{}'::uuid[];
  v_audit_ids uuid[] := '{}'::uuid[];
  v_event_id uuid;
  v_ordinary_count integer := 0;
  v_ordinary_activity_type text := 'lead_updated';
  v_stage_activity_type text;
  v_stage_audit_action text;
  v_now timestamptz := now();
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception using errcode = '22023', message = 'AI4CC_LEAD_CHANGES_INVALID';
  end if;

  if not exists (select 1 from jsonb_object_keys(p_changes)) then
    raise exception using errcode = '22023', message = 'AI4CC_LEAD_CHANGES_EMPTY';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_changes) as k(key)
    where k.key not in (
      'assignedAgentId',
      'pipelineStage',
      'priority',
      'score',
      'estimatedValue',
      'probability',
      'expectedCloseDate',
      'nextAction',
      'nextFollowUp',
      'lostReason'
    )
  ) then
    raise exception using errcode = '22023', message = 'AI4CC_LEAD_FIELD_NOT_SUPPORTED';
  end if;

  select m.role
  into v_role
  from public.ai4cc_tenant_members m
  where m.tenant_id = p_tenant_id
    and m.user_id = p_actor_user_id
  limit 1;

  if v_role is null then
    raise exception using errcode = '42501', message = 'AI4CC_TENANT_MEMBERSHIP_REQUIRED';
  end if;

  if v_role not in ('owner', 'admin', 'supervisor', 'operator', 'agent') then
    raise exception using errcode = '42501', message = 'AI4CC_LEAD_OPERATION_FORBIDDEN';
  end if;

  select *
  into v_before
  from public.ai4cc_leads l
  where l.id = p_lead_id
    and l.tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'AI4CC_LEAD_NOT_FOUND';
  end if;

  -- Role-level database protection duplicates the server API authorization.
  if v_role = 'operator' then
    if v_before.pipeline_stage in ('converted', 'lost') then
      raise exception using errcode = '42501', message = 'AI4CC_LEAD_OPERATION_FORBIDDEN';
    end if;
    if p_changes ? 'assignedAgentId' then
      raise exception using errcode = '42501', message = 'AI4CC_LEAD_ASSIGNMENT_FORBIDDEN';
    end if;
  elsif v_role = 'agent' then
    select a.id
    into v_actor_agent_id
    from public.ai4cc_agents a
    where a.tenant_id = p_tenant_id
      and a.auth_user_id = p_actor_user_id
    order by a.created_at asc
    limit 1;

    if v_actor_agent_id is null
       or v_before.assigned_agent_id is distinct from v_actor_agent_id
       or v_before.pipeline_stage in ('nurture', 'converted', 'lost') then
      raise exception using errcode = '42501', message = 'AI4CC_LEAD_OPERATION_FORBIDDEN';
    end if;

    if p_changes ? 'assignedAgentId'
       or p_changes ? 'estimatedValue'
       or p_changes ? 'probability'
       or p_changes ? 'expectedCloseDate'
       or p_changes ? 'lostReason' then
      raise exception using errcode = '42501', message = 'AI4CC_LEAD_FIELD_FORBIDDEN';
    end if;
  end if;

  if p_changes ? 'pipelineStage' then
    v_requested_stage := nullif(btrim(p_changes ->> 'pipelineStage'), '');
    if v_requested_stage is null
       or v_requested_stage not in ('new','qualified','contacted','follow_up','opportunity','converted','lost','nurture') then
      raise exception using errcode = '22023', message = 'AI4CC_PIPELINE_STAGE_INVALID';
    end if;

    if v_role = 'operator' and v_requested_stage in ('converted', 'lost') then
      raise exception using errcode = '42501', message = 'AI4CC_TERMINAL_TRANSITION_FORBIDDEN';
    end if;

    if v_role = 'agent' and v_requested_stage not in ('new','qualified','contacted','follow_up','opportunity') then
      raise exception using errcode = '42501', message = 'AI4CC_PIPELINE_TRANSITION_FORBIDDEN';
    end if;
  end if;

  if p_changes ? 'assignedAgentId' then
    if v_role not in ('owner', 'admin', 'supervisor') then
      raise exception using errcode = '42501', message = 'AI4CC_LEAD_ASSIGNMENT_FORBIDDEN';
    end if;

    if nullif(btrim(p_changes ->> 'assignedAgentId'), '') is null then
      raise exception using errcode = '22023', message = 'AI4CC_ASSIGNED_AGENT_REQUIRED';
    end if;

    begin
      v_requested_agent_id := (p_changes ->> 'assignedAgentId')::uuid;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'AI4CC_ASSIGNED_AGENT_INVALID';
    end;

    if not exists (
      select 1
      from public.ai4cc_agents a
      where a.id = v_requested_agent_id
        and a.tenant_id = p_tenant_id
    ) then
      raise exception using errcode = 'P0002', message = 'AI4CC_ASSIGNED_AGENT_NOT_FOUND';
    end if;
  end if;

  if p_changes ? 'lostReason' then
    v_requested_lost_reason := nullif(btrim(p_changes ->> 'lostReason'), '');
    if v_role not in ('owner', 'admin', 'supervisor') then
      raise exception using errcode = '42501', message = 'AI4CC_LOST_REASON_FORBIDDEN';
    end if;
    if coalesce(v_requested_stage, v_before.pipeline_stage) <> 'lost' then
      raise exception using errcode = 'P0001', message = 'AI4CC_LOST_REASON_STATE_CONFLICT';
    end if;
  end if;

  if coalesce(v_requested_stage, v_before.pipeline_stage) = 'lost' then
    v_requested_lost_reason := coalesce(v_requested_lost_reason, nullif(btrim(v_before.lost_reason), ''));
    if v_requested_lost_reason is null then
      raise exception using errcode = 'P0001', message = 'AI4CC_LOST_REASON_REQUIRED';
    end if;
  end if;

  update public.ai4cc_leads
  set
    assigned_agent_id = case
      when p_changes ? 'assignedAgentId' then v_requested_agent_id
      else assigned_agent_id
    end,
    pipeline_stage = case
      when p_changes ? 'pipelineStage' then v_requested_stage
      else pipeline_stage
    end,
    status = case
      when p_changes ? 'pipelineStage' and v_requested_stage = 'converted' then 'won'
      when p_changes ? 'pipelineStage' and v_requested_stage = 'lost' then 'lost'
      when p_changes ? 'pipelineStage' and v_requested_stage in ('new','qualified','contacted','follow_up','opportunity','nurture') then 'open'
      else status
    end,
    priority = case
      when p_changes ? 'priority' then p_changes ->> 'priority'
      else priority
    end,
    score = case
      when p_changes ? 'score' then (p_changes ->> 'score')::integer
      else score
    end,
    estimated_value = case
      when p_changes ? 'estimatedValue' then (p_changes ->> 'estimatedValue')::numeric
      else estimated_value
    end,
    probability = case
      when p_changes ? 'probability' then (p_changes ->> 'probability')::integer
      else probability
    end,
    expected_close_date = case
      when p_changes ? 'expectedCloseDate' then nullif(p_changes ->> 'expectedCloseDate', '')::date
      else expected_close_date
    end,
    next_action = case
      when p_changes ? 'nextAction' then nullif(btrim(p_changes ->> 'nextAction'), '')
      else next_action
    end,
    next_follow_up = case
      when p_changes ? 'nextFollowUp' then nullif(p_changes ->> 'nextFollowUp', '')::timestamptz
      else next_follow_up
    end,
    converted_at = case
      when p_changes ? 'pipelineStage' and v_requested_stage = 'converted' then v_now
      when p_changes ? 'pipelineStage' and v_requested_stage <> 'converted' then null
      else converted_at
    end,
    lost_reason = case
      when p_changes ? 'pipelineStage' and v_requested_stage = 'lost' then v_requested_lost_reason
      when p_changes ? 'pipelineStage' and v_requested_stage <> 'lost' then null
      when p_changes ? 'lostReason' then v_requested_lost_reason
      else lost_reason
    end,
    updated_at = v_now
  where id = p_lead_id
    and tenant_id = p_tenant_id
  returning * into v_after;

  -- Compute the exact material before/after change set.
  if v_before.assigned_agent_id is distinct from v_after.assigned_agent_id then
    v_changes := v_changes || jsonb_build_object('assignedAgentId', jsonb_build_object('before', v_before.assigned_agent_id, 'after', v_after.assigned_agent_id));
  end if;
  if v_before.pipeline_stage is distinct from v_after.pipeline_stage then
    v_changes := v_changes || jsonb_build_object('pipelineStage', jsonb_build_object('before', v_before.pipeline_stage, 'after', v_after.pipeline_stage));
  end if;
  if v_before.status is distinct from v_after.status then
    v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('before', v_before.status, 'after', v_after.status));
  end if;
  if v_before.priority is distinct from v_after.priority then
    v_changes := v_changes || jsonb_build_object('priority', jsonb_build_object('before', v_before.priority, 'after', v_after.priority));
    v_ordinary_count := v_ordinary_count + 1;
    v_ordinary_activity_type := 'lead_priority_changed';
  end if;
  if v_before.score is distinct from v_after.score then
    v_changes := v_changes || jsonb_build_object('score', jsonb_build_object('before', v_before.score, 'after', v_after.score));
    v_ordinary_count := v_ordinary_count + 1;
    v_ordinary_activity_type := 'lead_score_changed';
  end if;
  if v_before.estimated_value is distinct from v_after.estimated_value then
    v_changes := v_changes || jsonb_build_object('estimatedValue', jsonb_build_object('before', v_before.estimated_value, 'after', v_after.estimated_value));
    v_ordinary_count := v_ordinary_count + 1;
    v_ordinary_activity_type := 'lead_value_changed';
  end if;
  if v_before.probability is distinct from v_after.probability then
    v_changes := v_changes || jsonb_build_object('probability', jsonb_build_object('before', v_before.probability, 'after', v_after.probability));
    v_ordinary_count := v_ordinary_count + 1;
    v_ordinary_activity_type := 'lead_probability_changed';
  end if;
  if v_before.expected_close_date is distinct from v_after.expected_close_date then
    v_changes := v_changes || jsonb_build_object('expectedCloseDate', jsonb_build_object('before', v_before.expected_close_date, 'after', v_after.expected_close_date));
    v_ordinary_count := v_ordinary_count + 1;
    v_ordinary_activity_type := 'lead_expected_close_changed';
  end if;
  if v_before.next_action is distinct from v_after.next_action then
    v_changes := v_changes || jsonb_build_object('nextAction', jsonb_build_object('before', v_before.next_action, 'after', v_after.next_action));
    v_ordinary_count := v_ordinary_count + 1;
    v_ordinary_activity_type := 'lead_next_action_changed';
  end if;
  if v_before.next_follow_up is distinct from v_after.next_follow_up then
    v_changes := v_changes || jsonb_build_object('nextFollowUp', jsonb_build_object('before', v_before.next_follow_up, 'after', v_after.next_follow_up));
    v_ordinary_count := v_ordinary_count + 1;
    v_ordinary_activity_type := 'lead_follow_up_changed';
  end if;
  if v_before.converted_at is distinct from v_after.converted_at then
    v_changes := v_changes || jsonb_build_object('convertedAt', jsonb_build_object('before', v_before.converted_at, 'after', v_after.converted_at));
  end if;
  if v_before.lost_reason is distinct from v_after.lost_reason then
    v_changes := v_changes || jsonb_build_object('lostReason', jsonb_build_object('before', v_before.lost_reason, 'after', v_after.lost_reason));
    if v_before.pipeline_stage = v_after.pipeline_stage then
      v_ordinary_count := v_ordinary_count + 1;
      v_ordinary_activity_type := 'lead_updated';
    end if;
  end if;

  if not exists (select 1 from jsonb_object_keys(v_changes)) then
    raise exception using errcode = 'P0001', message = 'AI4CC_LEAD_NO_MATERIAL_CHANGE';
  end if;

  select coalesce(jsonb_agg(k.key order by k.key), '[]'::jsonb)
  into v_changed_fields
  from jsonb_object_keys(v_changes) as k(key);

  v_common_metadata := jsonb_build_object(
    'changedFields', v_changed_fields,
    'changes', v_changes,
    'actorRole', v_role
  );

  -- Assignment is always represented by its own explicit business event and audit.
  if v_before.assigned_agent_id is distinct from v_after.assigned_agent_id then
    insert into public.ai4cc_lead_activities (
      tenant_id, lead_id, contact_id, interaction_id, activity_type, direction,
      subject, actor_user_id, actor_agent_id, metadata
    ) values (
      p_tenant_id,
      v_after.id,
      v_after.contact_id,
      v_after.originating_interaction_id,
      case when v_before.assigned_agent_id is null then 'lead_assigned' else 'lead_reassigned' end,
      'internal',
      case when v_before.assigned_agent_id is null then 'Lead assigned' else 'Lead reassigned' end,
      p_actor_user_id,
      v_actor_agent_id,
      v_common_metadata || jsonb_build_object(
        'previousAssignedAgentId', v_before.assigned_agent_id,
        'assignedAgentId', v_after.assigned_agent_id
      )
    ) returning id into v_event_id;
    v_activity_ids := array_append(v_activity_ids, v_event_id);

    insert into public.ai4cc_audit_logs (
      tenant_id, actor_user_id, action, resource_type, resource_id, payload
    ) values (
      p_tenant_id,
      p_actor_user_id,
      'lead.assigned',
      'ai4cc_lead',
      v_after.id::text,
      v_common_metadata || jsonb_build_object('contactId', v_after.contact_id)
    ) returning id into v_event_id;
    v_audit_ids := array_append(v_audit_ids, v_event_id);
  end if;

  -- Pipeline transitions receive explicit semantic history, especially terminal states.
  if v_before.pipeline_stage is distinct from v_after.pipeline_stage then
    v_stage_activity_type := case
      when v_after.pipeline_stage = 'converted' then 'lead_converted'
      when v_after.pipeline_stage = 'lost' then 'lead_lost'
      when v_after.pipeline_stage = 'nurture' then 'lead_nurtured'
      else 'lead_stage_changed'
    end;

    v_stage_audit_action := case
      when v_after.pipeline_stage = 'converted' then 'lead.converted'
      when v_after.pipeline_stage = 'lost' then 'lead.lost'
      when v_after.pipeline_stage = 'nurture' then 'lead.nurtured'
      else 'lead.lifecycle_updated'
    end;

    insert into public.ai4cc_lead_activities (
      tenant_id, lead_id, contact_id, interaction_id, activity_type, direction,
      subject, actor_user_id, actor_agent_id, metadata
    ) values (
      p_tenant_id,
      v_after.id,
      v_after.contact_id,
      v_after.originating_interaction_id,
      v_stage_activity_type,
      'internal',
      case
        when v_after.pipeline_stage = 'converted' then 'Lead converted'
        when v_after.pipeline_stage = 'lost' then 'Lead marked lost'
        when v_after.pipeline_stage = 'nurture' then 'Lead moved to nurture'
        else 'Lead pipeline stage changed'
      end,
      p_actor_user_id,
      v_actor_agent_id,
      v_common_metadata
    ) returning id into v_event_id;
    v_activity_ids := array_append(v_activity_ids, v_event_id);

    insert into public.ai4cc_audit_logs (
      tenant_id, actor_user_id, action, resource_type, resource_id, payload
    ) values (
      p_tenant_id,
      p_actor_user_id,
      v_stage_audit_action,
      'ai4cc_lead',
      v_after.id::text,
      v_common_metadata || jsonb_build_object('contactId', v_after.contact_id)
    ) returning id into v_event_id;
    v_audit_ids := array_append(v_audit_ids, v_event_id);
  end if;

  -- Ordinary editable fields are grouped when multiple fields change together.
  if v_ordinary_count > 0 then
    if v_ordinary_count > 1 then
      v_ordinary_activity_type := 'lead_updated';
    end if;

    insert into public.ai4cc_lead_activities (
      tenant_id, lead_id, contact_id, interaction_id, activity_type, direction,
      subject, actor_user_id, actor_agent_id, metadata
    ) values (
      p_tenant_id,
      v_after.id,
      v_after.contact_id,
      v_after.originating_interaction_id,
      v_ordinary_activity_type,
      'internal',
      case when v_ordinary_activity_type = 'lead_updated' then 'Lead fields updated' else replace(v_ordinary_activity_type, '_', ' ') end,
      p_actor_user_id,
      v_actor_agent_id,
      v_common_metadata
    ) returning id into v_event_id;
    v_activity_ids := array_append(v_activity_ids, v_event_id);

    insert into public.ai4cc_audit_logs (
      tenant_id, actor_user_id, action, resource_type, resource_id, payload
    ) values (
      p_tenant_id,
      p_actor_user_id,
      'lead.lifecycle_updated',
      'ai4cc_lead',
      v_after.id::text,
      v_common_metadata || jsonb_build_object('contactId', v_after.contact_id)
    ) returning id into v_event_id;
    v_audit_ids := array_append(v_audit_ids, v_event_id);
  end if;

  return jsonb_build_object(
    'lead', to_jsonb(v_after),
    'activityIds', to_jsonb(v_activity_ids),
    'auditIds', to_jsonb(v_audit_ids),
    'changedFields', v_changed_fields,
    'actorRole', v_role
  );
end;
$function$
;

create table public.ai4cc_agent_assist_events (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  interaction_id uuid not null,
  agent_id uuid,
  detected_intent text,
  sentiment text,
  escalation_risk text,
  suggested_replies jsonb not null default '[]'::jsonb,
  kb_grounding jsonb not null default '[]'::jsonb,
  compliance_alerts jsonb not null default '[]'::jsonb,
  next_best_actions jsonb not null default '[]'::jsonb,
  model_info jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.ai4cc_agents (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  auth_user_id uuid,
  site_id uuid,
  name text not null,
  email text,
  status text not null default 'offline'::text,
  skills text[] not null default '{}'::text[],
  channels text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_audit_logs (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid,
  actor_user_id uuid,
  action text not null,
  resource_type text,
  resource_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.ai4cc_branding (
  tenant_id uuid not null,
  product_name text,
  company_name text,
  logo_url text,
  primary_domain text,
  support_email text,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_compliance_events (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  interaction_id uuid,
  rule_code text,
  severity text not null default 'info'::text,
  status text not null default 'open'::text,
  finding text not null,
  evidence jsonb not null default '{}'::jsonb,
  detected_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone
);

create table public.ai4cc_contacts (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  first_name text,
  last_name text,
  display_name text,
  company_name text,
  email text,
  phone text,
  preferred_channel text,
  lead_source text,
  lead_score integer not null default 0,
  priority text not null default 'normal'::text,
  sms_consent boolean not null default false,
  email_consent boolean not null default false,
  do_not_contact boolean not null default false,
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_deployments (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  flow_version_id uuid not null,
  environment text not null,
  status text not null default 'deployed'::text,
  provider text not null default 'internal'::text,
  provider_reference text,
  snapshot jsonb not null default '{}'::jsonb,
  deployed_by uuid,
  deployed_at timestamp with time zone not null default now()
);

create table public.ai4cc_flow_versions (
  id uuid not null default gen_random_uuid(),
  flow_id uuid not null,
  version integer not null,
  definition jsonb not null,
  parser_engine text not null default 'rules'::text,
  validation_status text not null default 'pending'::text,
  validation_report jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamp with time zone not null default now()
);

create table public.ai4cc_flows (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  description text,
  source_text text,
  channel text not null default 'voice'::text,
  status text not null default 'draft'::text,
  current_version integer not null default 1,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_integrations (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  provider text not null,
  integration_type text not null,
  display_name text not null,
  status text not null default 'configured'::text,
  config jsonb not null default '{}'::jsonb,
  secret_reference text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_interactions (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  channel text not null,
  direction text not null default 'inbound'::text,
  external_id text,
  customer_identifier text,
  queue_id uuid,
  agent_id uuid,
  flow_version_id uuid,
  status text not null default 'open'::text,
  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb
);

create table public.ai4cc_kb_articles (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null,
  body text not null,
  tags text[] not null default '{}'::text[],
  intent text,
  language text not null default 'en'::text,
  status text not null default 'published'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_lead_activities (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  lead_id uuid not null,
  contact_id uuid,
  interaction_id uuid,
  activity_type text not null,
  direction text,
  subject text,
  body text,
  outcome text,
  actor_user_id uuid,
  actor_agent_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.ai4cc_lead_tasks (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  lead_id uuid not null,
  contact_id uuid,
  assigned_agent_id uuid,
  title text not null,
  description text,
  task_type text not null default 'follow_up'::text,
  due_at timestamp with time zone,
  priority text not null default 'normal'::text,
  status text not null default 'pending'::text,
  completed_at timestamp with time zone,
  completed_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_leads (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid not null,
  originating_interaction_id uuid,
  originating_channel text,
  originating_queue_id uuid,
  originating_agent_id uuid,
  title text not null,
  service_interest text,
  description text,
  pipeline_stage text not null default 'new'::text,
  status text not null default 'open'::text,
  priority text not null default 'normal'::text,
  score integer not null default 0,
  estimated_value numeric(14,2) not null default 0,
  probability integer not null default 0,
  expected_close_date date,
  assigned_agent_id uuid,
  next_action text,
  next_follow_up timestamp with time zone,
  last_contacted_at timestamp with time zone,
  converted_at timestamp with time zone,
  lost_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_qa_scores (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  interaction_id uuid not null,
  agent_id uuid,
  quality_score numeric,
  compliance_score numeric,
  flow_adherence_score numeric,
  sentiment_score numeric,
  flags text[] not null default '{}'::text[],
  scoring_method text not null default 'rules'::text,
  scorecard jsonb not null default '{}'::jsonb,
  scored_at timestamp with time zone not null default now()
);

create table public.ai4cc_queues (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  site_id uuid,
  name text not null,
  code text not null,
  channel text not null default 'voice'::text,
  skills text[] not null default '{}'::text[],
  priority integer not null default 100,
  capacity integer,
  overflow_queue_id uuid,
  status text not null default 'active'::text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.ai4cc_routing_decisions (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  interaction_id uuid,
  intent text,
  priority text,
  selected_queue_id uuid,
  selected_site_id uuid,
  overflow_used boolean not null default false,
  estimated_wait_seconds integer,
  reason text,
  input jsonb not null default '{}'::jsonb,
  decided_at timestamp with time zone not null default now()
);

create table public.ai4cc_sites (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  code text not null,
  timezone text,
  status text not null default 'active'::text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.ai4cc_tenant_members (
  tenant_id uuid not null,
  user_id uuid not null,
  role text not null default 'operator'::text,
  created_at timestamp with time zone not null default now()
);

create table public.ai4cc_tenants (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  status text not null default 'active'::text,
  timezone text not null default 'America/Los_Angeles'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_transcripts (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  interaction_id uuid not null,
  speaker text,
  sequence_no integer not null default 0,
  content text not null,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  sentiment numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.ai4cc_voice_destination_deployments (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  destination_id uuid not null,
  destination_version_id uuid not null,
  environment text not null,
  status text not null default 'deployed'::text,
  snapshot jsonb not null default '{}'::jsonb,
  deployed_by uuid,
  deployed_at timestamp with time zone not null default now()
);

create table public.ai4cc_voice_destination_versions (
  id uuid not null default gen_random_uuid(),
  destination_id uuid not null,
  version integer not null,
  definition jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending'::text,
  validation_report jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamp with time zone not null default now()
);

create table public.ai4cc_voice_destinations (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  description text,
  destination_type text not null,
  status text not null default 'draft'::text,
  current_version integer not null default 1,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_voicemail_messages (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  interaction_id uuid not null,
  destination_id uuid,
  destination_version_id uuid,
  call_sid text not null,
  recording_sid text,
  recording_url text,
  caller_identifier text,
  duration_seconds integer,
  transcription text,
  transcription_status text not null default 'pending'::text,
  callback_status text not null default 'new'::text,
  assigned_queue_id uuid,
  assigned_agent_id uuid,
  received_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone,
  resolved_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.ai4cc_wfm_forecasts (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  site_id uuid,
  queue_id uuid,
  channel text,
  interval_start timestamp with time zone not null,
  interval_end timestamp with time zone not null,
  predicted_volume integer not null,
  predicted_aht_seconds integer,
  required_agents integer not null,
  sla_risk text,
  method text not null default 'rules'::text,
  model_info jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.ai4cc_agent_assist_events add constraint ai4cc_agent_assist_events_pkey PRIMARY KEY (id);

alter table public.ai4cc_agents add constraint ai4cc_agents_pkey PRIMARY KEY (id);

alter table public.ai4cc_agents add constraint ai4cc_agents_status_check CHECK ((status = ANY (ARRAY['offline'::text, 'available'::text, 'busy'::text, 'away'::text, 'inactive'::text])));

alter table public.ai4cc_agents add constraint ai4cc_agents_tenant_id_email_key UNIQUE (tenant_id, email);

alter table public.ai4cc_audit_logs add constraint ai4cc_audit_logs_pkey PRIMARY KEY (id);

alter table public.ai4cc_branding add constraint ai4cc_branding_pkey PRIMARY KEY (tenant_id);

alter table public.ai4cc_compliance_events add constraint ai4cc_compliance_events_pkey PRIMARY KEY (id);

alter table public.ai4cc_compliance_events add constraint ai4cc_compliance_events_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])));

alter table public.ai4cc_compliance_events add constraint ai4cc_compliance_events_status_check CHECK ((status = ANY (ARRAY['open'::text, 'reviewed'::text, 'resolved'::text, 'false_positive'::text])));

alter table public.ai4cc_contacts add constraint ai4cc_contacts_lead_score_check CHECK (((lead_score >= 0) AND (lead_score <= 100)));

alter table public.ai4cc_contacts add constraint ai4cc_contacts_pkey PRIMARY KEY (id);

alter table public.ai4cc_contacts add constraint ai4cc_contacts_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));

alter table public.ai4cc_deployments add constraint ai4cc_deployments_environment_check CHECK ((environment = ANY (ARRAY['dev'::text, 'qa'::text, 'staging'::text, 'production'::text])));

alter table public.ai4cc_deployments add constraint ai4cc_deployments_pkey PRIMARY KEY (id);

alter table public.ai4cc_deployments add constraint ai4cc_deployments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'deployed'::text, 'failed'::text, 'rolled_back'::text])));

alter table public.ai4cc_flow_versions add constraint ai4cc_flow_versions_flow_id_version_key UNIQUE (flow_id, version);

alter table public.ai4cc_flow_versions add constraint ai4cc_flow_versions_parser_engine_check CHECK ((parser_engine = ANY (ARRAY['rules'::text, 'ai'::text, 'imported'::text, 'manual'::text])));

alter table public.ai4cc_flow_versions add constraint ai4cc_flow_versions_pkey PRIMARY KEY (id);

alter table public.ai4cc_flow_versions add constraint ai4cc_flow_versions_validation_status_check CHECK ((validation_status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text, 'warning'::text])));

alter table public.ai4cc_flows add constraint ai4cc_flows_pkey PRIMARY KEY (id);

alter table public.ai4cc_flows add constraint ai4cc_flows_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'validated'::text, 'published'::text, 'archived'::text])));

alter table public.ai4cc_integrations add constraint ai4cc_integrations_pkey PRIMARY KEY (id);

alter table public.ai4cc_integrations add constraint ai4cc_integrations_status_check CHECK ((status = ANY (ARRAY['configured'::text, 'active'::text, 'inactive'::text, 'error'::text])));

alter table public.ai4cc_integrations add constraint ai4cc_integrations_tenant_id_provider_display_name_key UNIQUE (tenant_id, provider, display_name);

alter table public.ai4cc_interactions add constraint ai4cc_interactions_channel_check CHECK ((channel = ANY (ARRAY['voice'::text, 'chat'::text, 'email'::text, 'sms'::text, 'social'::text, 'simulation'::text])));

alter table public.ai4cc_interactions add constraint ai4cc_interactions_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text, 'internal'::text])));

alter table public.ai4cc_interactions add constraint ai4cc_interactions_pkey PRIMARY KEY (id);

alter table public.ai4cc_interactions add constraint ai4cc_interactions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'queued'::text, 'active'::text, 'completed'::text, 'abandoned'::text, 'failed'::text])));

alter table public.ai4cc_interactions add constraint ai4cc_interactions_tenant_id_channel_external_id_key UNIQUE (tenant_id, channel, external_id);

alter table public.ai4cc_kb_articles add constraint ai4cc_kb_articles_pkey PRIMARY KEY (id);

alter table public.ai4cc_kb_articles add constraint ai4cc_kb_articles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));

alter table public.ai4cc_lead_activities add constraint ai4cc_lead_activities_pkey PRIMARY KEY (id);

alter table public.ai4cc_lead_tasks add constraint ai4cc_lead_tasks_pkey PRIMARY KEY (id);

alter table public.ai4cc_lead_tasks add constraint ai4cc_lead_tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));

alter table public.ai4cc_lead_tasks add constraint ai4cc_lead_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])));

alter table public.ai4cc_leads add constraint ai4cc_leads_pipeline_stage_check CHECK ((pipeline_stage = ANY (ARRAY['new'::text, 'qualified'::text, 'contacted'::text, 'follow_up'::text, 'opportunity'::text, 'converted'::text, 'lost'::text, 'nurture'::text])));

alter table public.ai4cc_leads add constraint ai4cc_leads_pkey PRIMARY KEY (id);

alter table public.ai4cc_leads add constraint ai4cc_leads_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));

alter table public.ai4cc_leads add constraint ai4cc_leads_probability_check CHECK (((probability >= 0) AND (probability <= 100)));

alter table public.ai4cc_leads add constraint ai4cc_leads_score_check CHECK (((score >= 0) AND (score <= 100)));

alter table public.ai4cc_leads add constraint ai4cc_leads_status_check CHECK ((status = ANY (ARRAY['open'::text, 'won'::text, 'lost'::text, 'closed'::text])));

alter table public.ai4cc_qa_scores add constraint ai4cc_qa_scores_pkey PRIMARY KEY (id);

alter table public.ai4cc_qa_scores add constraint ai4cc_qa_scores_scoring_method_check CHECK ((scoring_method = ANY (ARRAY['rules'::text, 'ai'::text, 'human'::text, 'hybrid'::text])));

alter table public.ai4cc_queues add constraint ai4cc_queues_pkey PRIMARY KEY (id);

alter table public.ai4cc_queues add constraint ai4cc_queues_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));

alter table public.ai4cc_queues add constraint ai4cc_queues_tenant_id_code_key UNIQUE (tenant_id, code);

alter table public.ai4cc_routing_decisions add constraint ai4cc_routing_decisions_pkey PRIMARY KEY (id);

alter table public.ai4cc_sites add constraint ai4cc_sites_pkey PRIMARY KEY (id);

alter table public.ai4cc_sites add constraint ai4cc_sites_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));

alter table public.ai4cc_sites add constraint ai4cc_sites_tenant_id_code_key UNIQUE (tenant_id, code);

alter table public.ai4cc_tenant_members add constraint ai4cc_tenant_members_pkey PRIMARY KEY (tenant_id, user_id);

alter table public.ai4cc_tenant_members add constraint ai4cc_tenant_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text, 'agent'::text, 'viewer'::text])));

alter table public.ai4cc_tenants add constraint ai4cc_tenants_pkey PRIMARY KEY (id);

alter table public.ai4cc_tenants add constraint ai4cc_tenants_slug_key UNIQUE (slug);

alter table public.ai4cc_tenants add constraint ai4cc_tenants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])));

alter table public.ai4cc_transcripts add constraint ai4cc_transcripts_pkey PRIMARY KEY (id);

alter table public.ai4cc_voice_destination_deployments add constraint ai4cc_voice_destination_deployments_environment_check CHECK ((environment = ANY (ARRAY['dev'::text, 'qa'::text, 'staging'::text, 'production'::text])));

alter table public.ai4cc_voice_destination_deployments add constraint ai4cc_voice_destination_deployments_pkey PRIMARY KEY (id);

alter table public.ai4cc_voice_destination_deployments add constraint ai4cc_voice_destination_deployments_status_check CHECK ((status = ANY (ARRAY['deployed'::text, 'rolled_back'::text, 'retired'::text, 'failed'::text])));

alter table public.ai4cc_voice_destination_versions add constraint ai4cc_voice_destination_versions_destination_id_version_key UNIQUE (destination_id, version);

alter table public.ai4cc_voice_destination_versions add constraint ai4cc_voice_destination_versions_id_destination_id_key UNIQUE (id, destination_id);

alter table public.ai4cc_voice_destination_versions add constraint ai4cc_voice_destination_versions_pkey PRIMARY KEY (id);

alter table public.ai4cc_voice_destination_versions add constraint ai4cc_voice_destination_versions_validation_status_check CHECK ((validation_status = ANY (ARRAY['pending'::text, 'passed'::text, 'blocked'::text])));

alter table public.ai4cc_voice_destination_versions add constraint ai4cc_voice_destination_versions_version_check CHECK ((version > 0));

alter table public.ai4cc_voice_destinations add constraint ai4cc_voice_destinations_current_version_check CHECK ((current_version > 0));

alter table public.ai4cc_voice_destinations add constraint ai4cc_voice_destinations_destination_type_check CHECK ((destination_type = ANY (ARRAY['say'::text, 'voicemail'::text])));

alter table public.ai4cc_voice_destinations add constraint ai4cc_voice_destinations_pkey PRIMARY KEY (id);

alter table public.ai4cc_voice_destinations add constraint ai4cc_voice_destinations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text])));

alter table public.ai4cc_voice_destinations add constraint ai4cc_voice_destinations_tenant_id_name_key UNIQUE (tenant_id, name);

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_callback_status_check CHECK ((callback_status = ANY (ARRAY['new'::text, 'reviewed'::text, 'callback_pending'::text, 'resolved'::text])));

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_pkey PRIMARY KEY (id);

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_tenant_id_recording_sid_key UNIQUE (tenant_id, recording_sid);

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_transcription_status_check CHECK ((transcription_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'not_requested'::text])));

alter table public.ai4cc_wfm_forecasts add constraint ai4cc_wfm_forecasts_pkey PRIMARY KEY (id);

alter table public.ai4cc_agent_assist_events add constraint ai4cc_agent_assist_events_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES ai4cc_agents(id) ON DELETE SET NULL;

alter table public.ai4cc_agent_assist_events add constraint ai4cc_agent_assist_events_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES ai4cc_interactions(id) ON DELETE CASCADE;

alter table public.ai4cc_agent_assist_events add constraint ai4cc_agent_assist_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_agents add constraint ai4cc_agents_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.ai4cc_agents add constraint ai4cc_agents_site_id_fkey FOREIGN KEY (site_id) REFERENCES ai4cc_sites(id) ON DELETE SET NULL;

alter table public.ai4cc_agents add constraint ai4cc_agents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_audit_logs add constraint ai4cc_audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.ai4cc_audit_logs add constraint ai4cc_audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE SET NULL;

alter table public.ai4cc_branding add constraint ai4cc_branding_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_compliance_events add constraint ai4cc_compliance_events_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES ai4cc_interactions(id) ON DELETE CASCADE;

alter table public.ai4cc_compliance_events add constraint ai4cc_compliance_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_contacts add constraint ai4cc_contacts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_deployments add constraint ai4cc_deployments_deployed_by_fkey FOREIGN KEY (deployed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.ai4cc_deployments add constraint ai4cc_deployments_flow_version_id_fkey FOREIGN KEY (flow_version_id) REFERENCES ai4cc_flow_versions(id) ON DELETE RESTRICT;

alter table public.ai4cc_deployments add constraint ai4cc_deployments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_flow_versions add constraint ai4cc_flow_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.ai4cc_flow_versions add constraint ai4cc_flow_versions_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES ai4cc_flows(id) ON DELETE CASCADE;

alter table public.ai4cc_flows add constraint ai4cc_flows_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.ai4cc_flows add constraint ai4cc_flows_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_integrations add constraint ai4cc_integrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_interactions add constraint ai4cc_interactions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES ai4cc_agents(id) ON DELETE SET NULL;

alter table public.ai4cc_interactions add constraint ai4cc_interactions_flow_version_id_fkey FOREIGN KEY (flow_version_id) REFERENCES ai4cc_flow_versions(id) ON DELETE SET NULL;

alter table public.ai4cc_interactions add constraint ai4cc_interactions_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES ai4cc_queues(id) ON DELETE SET NULL;

alter table public.ai4cc_interactions add constraint ai4cc_interactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_kb_articles add constraint ai4cc_kb_articles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_lead_activities add constraint ai4cc_lead_activities_actor_agent_id_fkey FOREIGN KEY (actor_agent_id) REFERENCES ai4cc_agents(id) ON DELETE SET NULL;

alter table public.ai4cc_lead_activities add constraint ai4cc_lead_activities_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES ai4cc_contacts(id) ON DELETE SET NULL;

alter table public.ai4cc_lead_activities add constraint ai4cc_lead_activities_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES ai4cc_interactions(id) ON DELETE SET NULL;

alter table public.ai4cc_lead_activities add constraint ai4cc_lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES ai4cc_leads(id) ON DELETE CASCADE;

alter table public.ai4cc_lead_activities add constraint ai4cc_lead_activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_lead_tasks add constraint ai4cc_lead_tasks_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES ai4cc_agents(id) ON DELETE SET NULL;

alter table public.ai4cc_lead_tasks add constraint ai4cc_lead_tasks_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES ai4cc_contacts(id) ON DELETE SET NULL;

alter table public.ai4cc_lead_tasks add constraint ai4cc_lead_tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES ai4cc_leads(id) ON DELETE CASCADE;

alter table public.ai4cc_lead_tasks add constraint ai4cc_lead_tasks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_leads add constraint ai4cc_leads_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES ai4cc_agents(id) ON DELETE SET NULL;

alter table public.ai4cc_leads add constraint ai4cc_leads_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES ai4cc_contacts(id) ON DELETE CASCADE;

alter table public.ai4cc_leads add constraint ai4cc_leads_originating_agent_id_fkey FOREIGN KEY (originating_agent_id) REFERENCES ai4cc_agents(id) ON DELETE SET NULL;

alter table public.ai4cc_leads add constraint ai4cc_leads_originating_interaction_id_fkey FOREIGN KEY (originating_interaction_id) REFERENCES ai4cc_interactions(id) ON DELETE SET NULL;

alter table public.ai4cc_leads add constraint ai4cc_leads_originating_queue_id_fkey FOREIGN KEY (originating_queue_id) REFERENCES ai4cc_queues(id) ON DELETE SET NULL;

alter table public.ai4cc_leads add constraint ai4cc_leads_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_qa_scores add constraint ai4cc_qa_scores_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES ai4cc_agents(id) ON DELETE SET NULL;

alter table public.ai4cc_qa_scores add constraint ai4cc_qa_scores_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES ai4cc_interactions(id) ON DELETE CASCADE;

alter table public.ai4cc_qa_scores add constraint ai4cc_qa_scores_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_queues add constraint ai4cc_queues_overflow_queue_id_fkey FOREIGN KEY (overflow_queue_id) REFERENCES ai4cc_queues(id) ON DELETE SET NULL;

alter table public.ai4cc_queues add constraint ai4cc_queues_site_id_fkey FOREIGN KEY (site_id) REFERENCES ai4cc_sites(id) ON DELETE SET NULL;

alter table public.ai4cc_queues add constraint ai4cc_queues_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_routing_decisions add constraint ai4cc_routing_decisions_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES ai4cc_interactions(id) ON DELETE CASCADE;

alter table public.ai4cc_routing_decisions add constraint ai4cc_routing_decisions_selected_queue_id_fkey FOREIGN KEY (selected_queue_id) REFERENCES ai4cc_queues(id) ON DELETE SET NULL;

alter table public.ai4cc_routing_decisions add constraint ai4cc_routing_decisions_selected_site_id_fkey FOREIGN KEY (selected_site_id) REFERENCES ai4cc_sites(id) ON DELETE SET NULL;

alter table public.ai4cc_routing_decisions add constraint ai4cc_routing_decisions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_sites add constraint ai4cc_sites_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_tenant_members add constraint ai4cc_tenant_members_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_tenant_members add constraint ai4cc_tenant_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.ai4cc_transcripts add constraint ai4cc_transcripts_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES ai4cc_interactions(id) ON DELETE CASCADE;

alter table public.ai4cc_transcripts add constraint ai4cc_transcripts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_voice_destination_deployments add constraint ai4cc_voice_destination_deployments_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES ai4cc_voice_destinations(id) ON DELETE CASCADE;

alter table public.ai4cc_voice_destination_deployments add constraint ai4cc_voice_destination_deployments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_voice_destination_deployments add constraint ai4cc_voice_destination_deployments_version_fk FOREIGN KEY (destination_version_id, destination_id) REFERENCES ai4cc_voice_destination_versions(id, destination_id) ON DELETE RESTRICT;

alter table public.ai4cc_voice_destination_versions add constraint ai4cc_voice_destination_versions_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES ai4cc_voice_destinations(id) ON DELETE CASCADE;

alter table public.ai4cc_voice_destinations add constraint ai4cc_voice_destinations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES ai4cc_agents(id) ON DELETE SET NULL;

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_assigned_queue_id_fkey FOREIGN KEY (assigned_queue_id) REFERENCES ai4cc_queues(id) ON DELETE SET NULL;

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES ai4cc_voice_destinations(id) ON DELETE SET NULL;

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_destination_version_id_fkey FOREIGN KEY (destination_version_id) REFERENCES ai4cc_voice_destination_versions(id) ON DELETE SET NULL;

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES ai4cc_interactions(id) ON DELETE CASCADE;

alter table public.ai4cc_voicemail_messages add constraint ai4cc_voicemail_messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

alter table public.ai4cc_wfm_forecasts add constraint ai4cc_wfm_forecasts_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES ai4cc_queues(id) ON DELETE SET NULL;

alter table public.ai4cc_wfm_forecasts add constraint ai4cc_wfm_forecasts_site_id_fkey FOREIGN KEY (site_id) REFERENCES ai4cc_sites(id) ON DELETE SET NULL;

alter table public.ai4cc_wfm_forecasts add constraint ai4cc_wfm_forecasts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES ai4cc_tenants(id) ON DELETE CASCADE;

CREATE INDEX ai4cc_assist_interaction_idx ON public.ai4cc_agent_assist_events USING btree (interaction_id, created_at DESC);

CREATE INDEX ai4cc_agents_tenant_idx ON public.ai4cc_agents USING btree (tenant_id);

CREATE INDEX ai4cc_audit_tenant_created_idx ON public.ai4cc_audit_logs USING btree (tenant_id, created_at DESC);

CREATE INDEX ai4cc_compliance_interaction_idx ON public.ai4cc_compliance_events USING btree (interaction_id, detected_at DESC);

CREATE INDEX ai4cc_contacts_email_idx ON public.ai4cc_contacts USING btree (tenant_id, lower(email)) WHERE (email IS NOT NULL);

CREATE INDEX ai4cc_contacts_phone_idx ON public.ai4cc_contacts USING btree (tenant_id, phone) WHERE (phone IS NOT NULL);

CREATE INDEX ai4cc_contacts_tenant_idx ON public.ai4cc_contacts USING btree (tenant_id, updated_at DESC);

CREATE INDEX ai4cc_flow_versions_flow_idx ON public.ai4cc_flow_versions USING btree (flow_id, version DESC);

CREATE INDEX ai4cc_flows_tenant_idx ON public.ai4cc_flows USING btree (tenant_id, updated_at DESC);

CREATE INDEX ai4cc_interactions_tenant_started_idx ON public.ai4cc_interactions USING btree (tenant_id, started_at DESC);

CREATE INDEX ai4cc_lead_activities_lead_idx ON public.ai4cc_lead_activities USING btree (tenant_id, lead_id, created_at DESC);

CREATE INDEX ai4cc_lead_tasks_due_idx ON public.ai4cc_lead_tasks USING btree (tenant_id, status, due_at);

CREATE INDEX ai4cc_leads_origin_idx ON public.ai4cc_leads USING btree (tenant_id, originating_interaction_id) WHERE (originating_interaction_id IS NOT NULL);

CREATE INDEX ai4cc_leads_tenant_stage_idx ON public.ai4cc_leads USING btree (tenant_id, pipeline_stage, updated_at DESC);

CREATE UNIQUE INDEX ai4cc_leads_tenant_origin_unique_idx ON public.ai4cc_leads USING btree (tenant_id, originating_interaction_id) WHERE (originating_interaction_id IS NOT NULL);

CREATE INDEX ai4cc_qa_interaction_idx ON public.ai4cc_qa_scores USING btree (interaction_id, scored_at DESC);

CREATE INDEX ai4cc_queues_tenant_idx ON public.ai4cc_queues USING btree (tenant_id);

CREATE INDEX ai4cc_routing_interaction_idx ON public.ai4cc_routing_decisions USING btree (interaction_id, decided_at DESC);

CREATE INDEX ai4cc_members_user_idx ON public.ai4cc_tenant_members USING btree (user_id);

CREATE INDEX ai4cc_transcripts_interaction_idx ON public.ai4cc_transcripts USING btree (interaction_id, sequence_no);

CREATE INDEX ai4cc_voice_destination_deployments_lookup_idx ON public.ai4cc_voice_destination_deployments USING btree (tenant_id, environment, deployed_at DESC);

CREATE UNIQUE INDEX ai4cc_voice_destination_one_active_idx ON public.ai4cc_voice_destination_deployments USING btree (tenant_id, destination_id, environment) WHERE (status = 'deployed'::text);

CREATE INDEX ai4cc_voice_destination_versions_destination_idx ON public.ai4cc_voice_destination_versions USING btree (destination_id, version DESC);

CREATE INDEX ai4cc_voice_destinations_tenant_idx ON public.ai4cc_voice_destinations USING btree (tenant_id, updated_at DESC);

CREATE INDEX ai4cc_voicemail_messages_interaction_idx ON public.ai4cc_voicemail_messages USING btree (interaction_id, received_at DESC);

CREATE INDEX ai4cc_voicemail_messages_tenant_status_idx ON public.ai4cc_voicemail_messages USING btree (tenant_id, callback_status, received_at DESC);

CREATE INDEX ai4cc_wfm_tenant_interval_idx ON public.ai4cc_wfm_forecasts USING btree (tenant_id, interval_start);

alter table public.ai4cc_agent_assist_events enable row level security;

alter table public.ai4cc_agents enable row level security;

alter table public.ai4cc_audit_logs enable row level security;

alter table public.ai4cc_branding enable row level security;

alter table public.ai4cc_compliance_events enable row level security;

alter table public.ai4cc_contacts enable row level security;

alter table public.ai4cc_deployments enable row level security;

alter table public.ai4cc_flow_versions enable row level security;

alter table public.ai4cc_flows enable row level security;

alter table public.ai4cc_integrations enable row level security;

alter table public.ai4cc_interactions enable row level security;

alter table public.ai4cc_kb_articles enable row level security;

alter table public.ai4cc_lead_activities enable row level security;

alter table public.ai4cc_lead_tasks enable row level security;

alter table public.ai4cc_leads enable row level security;

alter table public.ai4cc_qa_scores enable row level security;

alter table public.ai4cc_queues enable row level security;

alter table public.ai4cc_routing_decisions enable row level security;

alter table public.ai4cc_sites enable row level security;

alter table public.ai4cc_tenant_members enable row level security;

alter table public.ai4cc_tenants enable row level security;

alter table public.ai4cc_transcripts enable row level security;

alter table public.ai4cc_voice_destination_deployments enable row level security;

alter table public.ai4cc_voice_destination_versions enable row level security;

alter table public.ai4cc_voice_destinations enable row level security;

alter table public.ai4cc_voicemail_messages enable row level security;

alter table public.ai4cc_wfm_forecasts enable row level security;

-- ---- RLS helper functions (referenced by the policies below) ----
create schema if not exists ai4cc_private;
grant usage on schema ai4cc_private to authenticated;

create or replace function ai4cc_private.has_tenant_role(target_tenant uuid, allowed_roles text[])
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1 from public.ai4cc_tenant_members m
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  );
$function$;

create or replace function ai4cc_private.is_tenant_member(target_tenant uuid)
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1 from public.ai4cc_tenant_members m
    where m.tenant_id = target_tenant and m.user_id = auth.uid()
  );
$function$;

revoke all on function ai4cc_private.has_tenant_role(uuid, text[]) from public, anon;
revoke all on function ai4cc_private.is_tenant_member(uuid) from public, anon;
grant execute on function ai4cc_private.has_tenant_role(uuid, text[]) to authenticated;
grant execute on function ai4cc_private.is_tenant_member(uuid) to authenticated;

create policy ai4cc_assist_member on public.ai4cc_agent_assist_events as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_assist_write on public.ai4cc_agent_assist_events as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text, 'agent'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text, 'agent'::text]));

create policy ai4cc_agents_admin on public.ai4cc_agents as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text]));

create policy ai4cc_agents_member on public.ai4cc_agents as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_audit_member on public.ai4cc_audit_logs as PERMISSIVE for SELECT to public using (((tenant_id IS NULL) OR ai4cc_private.is_tenant_member(tenant_id)));

create policy ai4cc_audit_write on public.ai4cc_audit_logs as PERMISSIVE for INSERT to public with check (((tenant_id IS NULL) OR ai4cc_private.is_tenant_member(tenant_id)));

create policy ai4cc_branding_admin on public.ai4cc_branding as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text]));

create policy ai4cc_branding_member on public.ai4cc_branding as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_compliance_member on public.ai4cc_compliance_events as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_compliance_write on public.ai4cc_compliance_events as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text]));

create policy ai4cc_contacts_manage_member on public.ai4cc_contacts as PERMISSIVE for ALL to public using (ai4cc_private.is_tenant_member(tenant_id)) with check (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_contacts_select_member on public.ai4cc_contacts as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_deployments_member on public.ai4cc_deployments as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_deployments_write on public.ai4cc_deployments as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text]));

create policy ai4cc_flow_versions_member on public.ai4cc_flow_versions as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(( SELECT f.tenant_id
   FROM ai4cc_flows f
  WHERE (f.id = ai4cc_flow_versions.flow_id))));

create policy ai4cc_flow_versions_write on public.ai4cc_flow_versions as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(( SELECT f.tenant_id
   FROM ai4cc_flows f
  WHERE (f.id = ai4cc_flow_versions.flow_id)), ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text])) with check (ai4cc_private.has_tenant_role(( SELECT f.tenant_id
   FROM ai4cc_flows f
  WHERE (f.id = ai4cc_flow_versions.flow_id)), ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text]));

create policy ai4cc_flows_member on public.ai4cc_flows as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_flows_write on public.ai4cc_flows as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text]));

create policy ai4cc_integrations_admin on public.ai4cc_integrations as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text]));

create policy ai4cc_integrations_member on public.ai4cc_integrations as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_interactions_member on public.ai4cc_interactions as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_interactions_write on public.ai4cc_interactions as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text, 'agent'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text, 'agent'::text]));

create policy ai4cc_kb_member on public.ai4cc_kb_articles as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_kb_write on public.ai4cc_kb_articles as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text]));

create policy ai4cc_lead_activities_select_member on public.ai4cc_lead_activities as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_lead_tasks_select_member on public.ai4cc_lead_tasks as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_leads_select_member on public.ai4cc_leads as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_qa_member on public.ai4cc_qa_scores as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_qa_write on public.ai4cc_qa_scores as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text]));

create policy ai4cc_queues_admin on public.ai4cc_queues as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text]));

create policy ai4cc_queues_member on public.ai4cc_queues as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_routing_member on public.ai4cc_routing_decisions as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_routing_write on public.ai4cc_routing_decisions as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text, 'agent'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text, 'agent'::text]));

create policy ai4cc_sites_admin on public.ai4cc_sites as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text]));

create policy ai4cc_sites_member on public.ai4cc_sites as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_members_manage_admin on public.ai4cc_tenant_members as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text]));

create policy ai4cc_members_select_member on public.ai4cc_tenant_members as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_tenants_select_member on public.ai4cc_tenants as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(id));

create policy ai4cc_tenants_update_admin on public.ai4cc_tenants as PERMISSIVE for UPDATE to public using (ai4cc_private.has_tenant_role(id, ARRAY['owner'::text, 'admin'::text])) with check (ai4cc_private.has_tenant_role(id, ARRAY['owner'::text, 'admin'::text]));

create policy ai4cc_transcripts_member on public.ai4cc_transcripts as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_transcripts_write on public.ai4cc_transcripts as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text, 'agent'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text, 'agent'::text]));

create policy ai4cc_voice_destination_deployments_member on public.ai4cc_voice_destination_deployments as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_voice_destination_deployments_write on public.ai4cc_voice_destination_deployments as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text]));

create policy ai4cc_voice_destination_versions_member on public.ai4cc_voice_destination_versions as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(( SELECT d.tenant_id
   FROM ai4cc_voice_destinations d
  WHERE (d.id = ai4cc_voice_destination_versions.destination_id))));

create policy ai4cc_voice_destination_versions_write on public.ai4cc_voice_destination_versions as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(( SELECT d.tenant_id
   FROM ai4cc_voice_destinations d
  WHERE (d.id = ai4cc_voice_destination_versions.destination_id)), ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text])) with check (ai4cc_private.has_tenant_role(( SELECT d.tenant_id
   FROM ai4cc_voice_destinations d
  WHERE (d.id = ai4cc_voice_destination_versions.destination_id)), ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text]));

create policy ai4cc_voice_destinations_member on public.ai4cc_voice_destinations as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_voice_destinations_write on public.ai4cc_voice_destinations as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text]));

create policy ai4cc_voicemail_messages_member on public.ai4cc_voicemail_messages as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_voicemail_messages_write on public.ai4cc_voicemail_messages as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text, 'operator'::text]));

create policy ai4cc_wfm_member on public.ai4cc_wfm_forecasts as PERMISSIVE for SELECT to public using (ai4cc_private.is_tenant_member(tenant_id));

create policy ai4cc_wfm_write on public.ai4cc_wfm_forecasts as PERMISSIVE for ALL to public using (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text])) with check (ai4cc_private.has_tenant_role(tenant_id, ARRAY['owner'::text, 'admin'::text, 'supervisor'::text]));

CREATE TRIGGER ai4cc_agents_updated_at BEFORE UPDATE ON public.ai4cc_agents FOR EACH ROW EXECUTE FUNCTION ai4cc_set_updated_at();

CREATE TRIGGER ai4cc_flows_updated_at BEFORE UPDATE ON public.ai4cc_flows FOR EACH ROW EXECUTE FUNCTION ai4cc_set_updated_at();

CREATE TRIGGER ai4cc_integrations_updated_at BEFORE UPDATE ON public.ai4cc_integrations FOR EACH ROW EXECUTE FUNCTION ai4cc_set_updated_at();

CREATE TRIGGER ai4cc_kb_articles_updated_at BEFORE UPDATE ON public.ai4cc_kb_articles FOR EACH ROW EXECUTE FUNCTION ai4cc_set_updated_at();

CREATE TRIGGER ai4cc_tenants_updated_at BEFORE UPDATE ON public.ai4cc_tenants FOR EACH ROW EXECUTE FUNCTION ai4cc_set_updated_at();

-- ---- Hardening for new projects ----
-- Every access path in this app uses the service role (server) or authenticated users through
-- RLS. The anon role never needs table or function access.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
