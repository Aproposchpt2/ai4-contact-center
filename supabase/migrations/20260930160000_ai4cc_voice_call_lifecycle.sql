-- Record voice call lifecycle from the signed ElevenLabs post-call webhook, independently
-- of the conversational intake tools. One interaction per (tenant, voice, conversation ID).
-- Never creates a lead. Service role only; the webhook resolves the tenant from the
-- signed event's agent binding.
create or replace function public.ai4cc_record_voice_call_event(
  p_tenant_id uuid, p_conversation_id text, p_event_type text,
  p_started_at timestamptz, p_ended_at timestamptz, p_caller_phone text, p_details jsonb
) returns jsonb
language plpgsql
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_interaction public.ai4cc_interactions%rowtype;
  v_id uuid;
  v_created boolean;
  v_has_lead boolean;
  v_failed boolean := p_event_type='call_initiation_failure';
  v_end timestamptz;
  v_end_source text;
  v_provider jsonb;
  v_outcome text;
begin
  if p_event_type not in ('post_call_transcription','call_initiation_failure') then
    raise exception using errcode='22023', message='AI4CC_CALL_EVENT_TYPE_INVALID';
  end if;
  if nullif(btrim(coalesce(p_conversation_id,'')),'') is null then
    raise exception using errcode='22023', message='AI4CC_CALL_EVENT_CONVERSATION_REQUIRED';
  end if;
  if p_details is null or jsonb_typeof(p_details)<>'object' or exists (
    select 1 from jsonb_object_keys(p_details) k(key)
    where k.key not in ('agentId','callSid','agentNumber','terminationReason','callDurationSecs',
      'conversationStatus','callSuccessful','transcriptSummary','failureReason','userTurnCount','intakeToolCalled')
  ) then
    raise exception using errcode='22023', message='AI4CC_CALL_EVENT_DETAILS_INVALID';
  end if;

  -- Provider end time when the event carries it; otherwise receipt time, labelled as such.
  v_end := coalesce(p_ended_at,now());
  v_end_source := case when p_ended_at is not null then 'provider' else 'webhook_receipt' end;
  v_provider := p_details||jsonb_build_object(
    'providerCallEvent',p_event_type,
    'providerRecordedAt',now(),
    'providerStartedAt',p_started_at,
    'providerEndedAt',p_ended_at
  );

  insert into public.ai4cc_interactions(
    tenant_id,channel,direction,external_id,customer_identifier,status,started_at,ended_at,metadata
  ) values (
    p_tenant_id,'voice','inbound',p_conversation_id,nullif(btrim(coalesce(p_caller_phone,'')),''),
    case when v_failed then 'failed' else 'abandoned' end,
    coalesce(p_started_at,v_end),v_end,
    jsonb_build_object(
      'source','elevenlabs_agent',
      'agentName','AI4CC Business Intake Agent',
      'elevenlabsConversationId',p_conversation_id,
      'createdBy','post_call_webhook',
      'intakeOutcome','not_started',
      'endTimestampSource',v_end_source
    )||v_provider
  )
  on conflict (tenant_id,channel,external_id) do nothing
  returning id into v_id;
  v_created := v_id is not null;

  -- Serializes against intake submit, timeout cleanup and duplicate deliveries.
  select * into v_interaction from public.ai4cc_interactions i
  where i.tenant_id=p_tenant_id and i.channel='voice' and i.external_id=p_conversation_id
  for update;
  if v_interaction.metadata->>'source' is distinct from 'elevenlabs_agent' then
    raise exception using errcode='22023', message='AI4CC_CALL_EVENT_SOURCE_INVALID';
  end if;

  if v_created then
    v_outcome := case when v_failed then 'initiation_failed' else 'ended_before_intake' end;
  elsif v_interaction.metadata ? 'providerCallEvent' then
    -- Valid retry or duplicate delivery: no second write or audit.
    return jsonb_build_object('interactionId',v_interaction.id,'created',false,
      'outcome',v_interaction.metadata->>'callLifecycleOutcome','replayed',true);
  else
    select exists(
      select 1 from public.ai4cc_leads l
      where l.tenant_id=p_tenant_id and l.originating_interaction_id=v_interaction.id
    ) into v_has_lead;

    if not v_has_lead and v_interaction.status in ('open','queued','active') then
      -- Intake started but was never submitted before the caller left.
      v_outcome := 'intake_incomplete';
      update public.ai4cc_interactions
      set status=case when v_failed then 'failed' else 'abandoned' end,
        ended_at=v_end,
        customer_identifier=coalesce(customer_identifier,nullif(btrim(coalesce(p_caller_phone,'')),'')),
        metadata=metadata||v_provider||jsonb_build_object('intakeOutcome','incomplete','endTimestampSource',v_end_source)
      where id=v_interaction.id;
    elsif not v_has_lead and v_interaction.status='abandoned'
      and v_interaction.metadata->>'endTimestampSource'='timeout_cleanup' then
      -- Cleanup closed it first; replace the cleanup time with the actual end time.
      v_outcome := 'timeout_end_corrected';
      update public.ai4cc_interactions
      set ended_at=case when v_end_source='provider' then v_end else ended_at end,
        customer_identifier=coalesce(customer_identifier,nullif(btrim(coalesce(p_caller_phone,'')),'')),
        metadata=metadata||v_provider||jsonb_build_object(
          'intakeOutcome','incomplete',
          'cleanupEndedAt',v_interaction.ended_at,
          'endTimestampSource',case when v_end_source='provider' then 'provider' else 'timeout_cleanup' end)
      where id=v_interaction.id;
    else
      -- Completed intake (or any other settled state): keep status, end time, lead and
      -- contact; only attach the provider's call details.
      v_outcome := 'details_attached';
      update public.ai4cc_interactions
      set customer_identifier=coalesce(customer_identifier,nullif(btrim(coalesce(p_caller_phone,'')),'')),
        metadata=metadata||v_provider
      where id=v_interaction.id;
    end if;
  end if;

  update public.ai4cc_interactions
  set metadata=metadata||jsonb_build_object('callLifecycleOutcome',v_outcome)
  where id=v_interaction.id;

  insert into public.ai4cc_audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,payload)
  values(p_tenant_id,null,
    case when v_failed then 'interaction.call_initiation_failed' else 'interaction.call_ended' end,
    'ai4cc_interaction',v_interaction.id::text,
    jsonb_build_object('conversationId',p_conversation_id,'outcome',v_outcome,'created',v_created,
      'terminationReason',p_details->>'terminationReason','failureReason',p_details->>'failureReason',
      'providerStartedAt',p_started_at,'providerEndedAt',p_ended_at,'endTimestampSource',v_end_source));

  return jsonb_build_object('interactionId',v_interaction.id,'created',v_created,
    'outcome',v_outcome,'replayed',false);
end;
$function$;

revoke all on function public.ai4cc_record_voice_call_event(uuid,text,text,timestamptz,timestamptz,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.ai4cc_record_voice_call_event(uuid,text,text,timestamptz,timestamptz,text,jsonb)
  to service_role;

-- Out-of-order completion: an intake submit that lands after the post-call event closed the
-- interaction as incomplete can still complete it, keeping the provider's actual end time.
-- Otherwise identical to 20260930134204_ai4cc_intake_timeout.sql.
create or replace function public.ai4cc_submit_voice_intake(
  p_tenant_id uuid, p_actor_user_id uuid, p_interaction_id uuid,
  p_identifier_type text, p_identifier_value text, p_email text, p_phone text,
  p_contact_name text, p_company_name text, p_service_interest text,
  p_description text, p_metadata jsonb
) returns jsonb
language plpgsql
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_interaction public.ai4cc_interactions%rowtype;
  v_lead public.ai4cc_leads%rowtype;
  v_contact public.ai4cc_contacts%rowtype;
  v_result jsonb;
  v_timeout_recovery boolean;
  v_provider_recovery boolean;
begin
  if not exists (
    select 1 from public.tenant_users m
    where m.tenant_id=p_tenant_id and m.user_id=p_actor_user_id and m.status='ACTIVE'
  ) then
    raise exception using errcode='42501', message='STELLAR_TENANT_MEMBERSHIP_REQUIRED';
  end if;

  -- Serializes submit and replay for this interaction, including concurrent callers.
  select * into v_interaction from public.ai4cc_interactions i
  where i.id=p_interaction_id and i.tenant_id=p_tenant_id for update;
  if not found then
    raise exception using errcode='P0002', message='AI4CC_INTERACTION_NOT_FOUND';
  end if;
  if v_interaction.channel <> 'voice' or v_interaction.metadata->>'source' is distinct from 'elevenlabs_agent' then
    raise exception using errcode='22023', message='AI4CC_INTAKE_SOURCE_INVALID';
  end if;

  select * into v_lead from public.ai4cc_leads l
  where l.originating_interaction_id=p_interaction_id and l.tenant_id=p_tenant_id;
  if found then
    select * into v_contact from public.ai4cc_contacts c
    where c.id=v_lead.contact_id and c.tenant_id=p_tenant_id;
    return jsonb_build_object(
      'lead',to_jsonb(v_lead),'contact',to_jsonb(v_contact),'replayed',true,
      'activityId',(select a.id from public.ai4cc_lead_activities a
        where a.tenant_id=p_tenant_id and a.lead_id=v_lead.id and a.activity_type='lead_created'
        order by a.created_at,a.id limit 1),
      'auditId',(select a.id from public.ai4cc_audit_logs a
        where a.tenant_id=p_tenant_id and a.resource_id=v_lead.id::text and a.action='lead.created_from_interaction'
        order by a.created_at,a.id limit 1)
    );
  end if;

  -- Completed interactions without a lead from the old partial-write path can recover.
  v_provider_recovery := v_interaction.status='abandoned'
    and v_interaction.metadata->>'providerCallEvent'='post_call_transcription'
    and v_interaction.metadata->>'intakeOutcome' in ('not_started','incomplete');
  v_timeout_recovery := v_interaction.status='abandoned'
    and v_interaction.metadata->>'intakeTimeoutReason'='submission_timeout'
    and not coalesce(v_provider_recovery,false);
  if v_interaction.status not in ('open','queued','active','completed')
    and not coalesce(v_timeout_recovery,false) and not coalesce(v_provider_recovery,false) then
    raise exception using errcode='22023', message='AI4CC_INTAKE_INTERACTION_STATE_INVALID';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata)<>'object' or exists (
    select 1 from jsonb_object_keys(p_metadata) k(key)
    where k.key not in ('businessName','callerName','email','phone','description','serviceInterest')
  ) then
    raise exception using errcode='22023', message='AI4CC_INTAKE_METADATA_INVALID';
  end if;

  update public.ai4cc_interactions
  set status='completed',
    ended_at=case when v_provider_recovery then ended_at
      when v_timeout_recovery then now() else coalesce(ended_at,now()) end,
    metadata=metadata||p_metadata||case
      when v_provider_recovery then jsonb_build_object('intakeRecoveredAt',now(),'intakeOutcome','submitted_late')
      when v_timeout_recovery then jsonb_build_object('intakeRecoveredAt',now(),'endTimestampSource','submit')
      else '{}'::jsonb end
  where id=p_interaction_id and tenant_id=p_tenant_id;

  v_result := public.ai4cc_create_lead_from_interaction(
    p_tenant_id,p_actor_user_id,p_interaction_id,p_identifier_type,p_identifier_value,
    p_email,p_phone,p_contact_name,p_company_name,
    case when nullif(p_company_name,'') is not null then p_company_name||' — voice intake' else 'Voice intake lead' end,
    p_service_interest,p_description,'new','normal',50,0,0,'Review intake call and follow up.',null
  );
  if v_timeout_recovery or v_provider_recovery then
    insert into public.ai4cc_audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,payload)
    values(p_tenant_id,p_actor_user_id,'interaction.intake_recovered','ai4cc_interaction',p_interaction_id::text,
      jsonb_build_object('previousStatus','abandoned',
        'reason',case when v_provider_recovery then 'submit_after_call_end' else 'late_valid_submit' end,
        'leadId',v_result->'lead'->>'id'));
  end if;
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.ai4cc_submit_voice_intake(
  uuid,uuid,uuid,text,text,text,text,text,text,text,text,jsonb
) from public,anon,authenticated;
grant execute on function public.ai4cc_submit_voice_intake(
  uuid,uuid,uuid,text,text,text,text,text,text,text,text,jsonb
) to service_role;
