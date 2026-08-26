-- AI4CC CR-01B Package 01 — Transactional Lead Lifecycle + RBAC
-- Preserves CR-01A interaction -> contact -> lead creation authority.
-- Operational Lead mutations are server/RPC-controlled and atomically write
-- Lead state + semantic business Activity + canonical Audit evidence.

create or replace function public.ai4cc_update_lead_lifecycle(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_lead_id uuid,
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
$$;

revoke all on function public.ai4cc_update_lead_lifecycle(uuid, uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.ai4cc_update_lead_lifecycle(uuid, uuid, uuid, jsonb)
  to service_role;

-- Direct authenticated Data API writes are intentionally closed for Package 01.
-- Reads remain tenant-scoped through the existing SELECT policies. All operational
-- Lead writes flow through the authenticated server API and service-role RPC.
drop policy if exists ai4cc_leads_manage_member on public.ai4cc_leads;
drop policy if exists ai4cc_lead_activities_insert_member on public.ai4cc_lead_activities;

revoke insert, update, delete, truncate on table public.ai4cc_leads from anon, authenticated;
revoke insert, update, delete, truncate on table public.ai4cc_lead_activities from anon, authenticated;

comment on function public.ai4cc_update_lead_lifecycle(uuid, uuid, uuid, jsonb) is
  'CR-01B Package 01 transactional Lead mutation authority. Derives membership role, enforces tenant/RBAC/lifecycle rules, and atomically records business Activity and Audit evidence.';
