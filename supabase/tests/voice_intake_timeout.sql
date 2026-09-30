-- Administrative connection. Synthetic records and role changes are rolled back.
begin;
set local role service_role;
do $test$
declare
  t uuid; u uuid; stale uuid; recent uuid; active_call uuid; unrelated uuid; linked uuid;
  r jsonb; v_email text := 'vat-timeout-'||gen_random_uuid()::text||'@example.invalid';
  n integer;
begin
  select tenant_id,user_id into t,u from public.tenant_users
  where status='ACTIVE' and role in ('OWNER','ADMIN') order by tenant_id,user_id limit 1;
  if t is null then raise exception 'Test needs an active tenant owner'; end if;
  insert into public.ai4cc_interactions(tenant_id,channel,status,started_at,metadata)
  values(t,'voice','open',now()-interval '61 minutes','{"source":"elevenlabs_agent","vat":"rollback"}') returning id into stale;
  insert into public.ai4cc_interactions(tenant_id,channel,status,started_at,metadata)
  values(t,'voice','open',now()-interval '5 minutes','{"source":"elevenlabs_agent","vat":"rollback"}') returning id into recent;
  insert into public.ai4cc_interactions(tenant_id,channel,status,started_at,metadata)
  values(t,'voice','active',now()-interval '61 minutes','{"source":"elevenlabs_agent","vat":"rollback"}') returning id into active_call;
  insert into public.ai4cc_interactions(tenant_id,channel,status,started_at,metadata)
  values(t,'voice','open',now()-interval '61 minutes','{"source":"other_provider","vat":"rollback"}') returning id into unrelated;
  insert into public.ai4cc_interactions(tenant_id,channel,status,started_at,metadata)
  values(t,'voice','open',now()-interval '61 minutes','{"source":"elevenlabs_agent","vat":"rollback"}') returning id into linked;
  r := public.ai4cc_submit_voice_intake(t,u,linked,'email',v_email,v_email,'+12025550199','VAT test',null,null,'Test','{}');
  update public.ai4cc_interactions set status='open',ended_at=null where id=linked;

  -- A tenant filter must not let the cleanup act on another tenant's records.
  n := public.ai4cc_expire_voice_intakes(gen_random_uuid());
  if n<>0 then raise exception 'FAIL tenant filter'; end if;
  n := public.ai4cc_expire_voice_intakes(t);
  if not exists(select 1 from public.ai4cc_interactions where id=stale and status='abandoned'
    and ended_at is not null and metadata->>'endTimestampSource'='timeout_cleanup') then raise exception 'FAIL stale cleanup'; end if;
  if exists(select 1 from public.ai4cc_interactions where id in (recent,unrelated,linked) and status<>'open')
    or exists(select 1 from public.ai4cc_interactions where id=active_call and status<>'active') then raise exception 'FAIL protected interaction changed'; end if;
  if (select count(*) from public.ai4cc_audit_logs where resource_id=stale::text and action='interaction.intake_timed_out')<>1 then raise exception 'FAIL timeout audit'; end if;
  perform public.ai4cc_expire_voice_intakes(t);
  if (select count(*) from public.ai4cc_audit_logs where resource_id=stale::text and action='interaction.intake_timed_out')<>1 then raise exception 'FAIL duplicate timeout audit'; end if;

  r := public.ai4cc_submit_voice_intake(t,u,stale,'email',v_email,v_email,'+12025550199','VAT test',null,null,'Late submit','{}');
  if r->>'replayed' is distinct from 'false' or not exists(select 1 from public.ai4cc_interactions where id=stale and status='completed'
    and metadata->>'endTimestampSource'='submit' and metadata ? 'intakeRecoveredAt') then raise exception 'FAIL late recovery'; end if;
  if (select count(*) from public.ai4cc_audit_logs where resource_id=stale::text and action='interaction.intake_recovered')<>1 then raise exception 'FAIL recovery audit'; end if;
  r := public.ai4cc_submit_voice_intake(t,u,stale,'email',v_email,v_email,null,'VAT test',null,null,'Replay','{}');
  if r->>'replayed' is distinct from 'true' then raise exception 'FAIL late replay'; end if;
  if (select count(*) from public.ai4cc_leads where originating_interaction_id=stale)<>1 then raise exception 'FAIL duplicate recovered lead'; end if;

  update public.ai4cc_interactions set status='abandoned' where id=recent;
  begin
    perform public.ai4cc_submit_voice_intake(t,u,recent,'email',v_email,v_email,null,'VAT test',null,null,'Test','{}');
    raise exception 'FAIL ordinary abandonment accepted';
  exception when invalid_parameter_value then null; end;
end;
$test$;
rollback;
select 'PASS stale timeout, recent and active protection, provider and tenant scope, existing lead protection, one timeout audit, late recovery, one recovered lead and audit, replay, ordinary abandonment rejection; writes rolled back.' as result;
