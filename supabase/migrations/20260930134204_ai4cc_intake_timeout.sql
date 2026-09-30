-- Reconcile unsubmitted voice intake attempts without inventing a completed lead.
create or replace function public.ai4cc_expire_voice_intakes(p_tenant_id uuid default null)
returns integer
language plpgsql
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
declare v_count integer;
begin
  with stale as (
    select i.id from public.ai4cc_interactions i
    where i.channel='voice' and i.status='open' and i.ended_at is null
      and i.metadata->>'source'='elevenlabs_agent'
      and i.started_at < now()-interval '60 minutes'
      and (p_tenant_id is null or i.tenant_id=p_tenant_id)
      and not exists (
        select 1 from public.ai4cc_leads l
        where l.tenant_id=i.tenant_id and l.originating_interaction_id=i.id
      )
    order by i.started_at,i.id limit 100
    for update of i skip locked
  ), closed as (
    update public.ai4cc_interactions i
    set status='abandoned',ended_at=now(),
      metadata=i.metadata||jsonb_build_object(
        'intakeTimeoutReason','submission_timeout',
        'intakeTimeoutAt',now(),
        'intakeTimeoutMinutes',60,
        'endTimestampSource','timeout_cleanup'
      )
    from stale s where i.id=s.id and i.status='open'
    returning i.id,i.tenant_id,i.started_at,i.ended_at
  ), audited as (
    insert into public.ai4cc_audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,payload)
    select tenant_id,null,'interaction.intake_timed_out','ai4cc_interaction',id::text,
      jsonb_build_object('reason','submission_timeout','timeoutMinutes',60,
        'startedAt',started_at,'closedAt',ended_at,'endTimestampSource','timeout_cleanup')
    from closed returning id
  ) select count(*) into v_count from audited;
  return v_count;
end;
$function$;
revoke all on function public.ai4cc_expire_voice_intakes(uuid) from public,anon,authenticated;
grant execute on function public.ai4cc_expire_voice_intakes(uuid) to service_role;

-- A late valid submission can recover only our own submission timeout.
-- Complete intake and create its canonical lead in a single transaction.
-- Service role only; the webhook resolves the tenant and actor from its intake key.
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
  v_timeout_recovery := v_interaction.status='abandoned'
    and v_interaction.metadata->>'intakeTimeoutReason'='submission_timeout';
  if v_interaction.status not in ('open','queued','active','completed')
    and not coalesce(v_timeout_recovery,false) then
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
    ended_at=case when v_timeout_recovery then now() else coalesce(ended_at,now()) end,
    metadata=metadata||p_metadata||case when v_timeout_recovery
      then jsonb_build_object('intakeRecoveredAt',now(),'endTimestampSource','submit')
      else '{}'::jsonb end
  where id=p_interaction_id and tenant_id=p_tenant_id;

  v_result := public.ai4cc_create_lead_from_interaction(
    p_tenant_id,p_actor_user_id,p_interaction_id,p_identifier_type,p_identifier_value,
    p_email,p_phone,p_contact_name,p_company_name,
    case when nullif(p_company_name,'') is not null then p_company_name||' — voice intake' else 'Voice intake lead' end,
    p_service_interest,p_description,'new','normal',50,0,0,'Review intake call and follow up.',null
  );
  if v_timeout_recovery then
    insert into public.ai4cc_audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,payload)
    values(p_tenant_id,p_actor_user_id,'interaction.intake_recovered','ai4cc_interaction',p_interaction_id::text,
      jsonb_build_object('previousStatus','abandoned','reason','late_valid_submit','leadId',v_result->'lead'->>'id'));
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

create extension if not exists pg_cron;
select cron.schedule('ai4cc-intake-timeout','* * * * *','select public.ai4cc_expire_voice_intakes();');
