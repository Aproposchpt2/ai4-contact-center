-- AI4CC CR-01A integrity corrections
-- Adds database-atomic duplicate protection and one transactional
-- Contact -> Lead -> Activity -> Audit creation operation.

create unique index if not exists ai4cc_leads_tenant_origin_unique_idx
  on public.ai4cc_leads (tenant_id, originating_interaction_id)
  where originating_interaction_id is not null;

create or replace function public.ai4cc_create_lead_from_interaction(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_interaction_id uuid,
  p_identifier_type text,
  p_identifier_value text,
  p_email text,
  p_phone text,
  p_contact_name text,
  p_company_name text,
  p_title text,
  p_service_interest text,
  p_description text,
  p_pipeline_stage text,
  p_priority text,
  p_score integer,
  p_estimated_value numeric,
  p_probability integer,
  p_next_action text,
  p_next_follow_up timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
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
$$;

revoke all on function public.ai4cc_create_lead_from_interaction(
  uuid, uuid, uuid, text, text, text, text, text, text, text,
  text, text, text, text, integer, numeric, integer, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.ai4cc_create_lead_from_interaction(
  uuid, uuid, uuid, text, text, text, text, text, text, text,
  text, text, text, text, integer, numeric, integer, text, timestamptz
) to service_role;
