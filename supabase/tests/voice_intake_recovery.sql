-- Run with an administrative database connection. All synthetic writes roll back.
begin;
set local role service_role;
do $test$
declare
  t uuid; u uuid; i uuid; legacy uuid; other uuid; r jsonb; replay jsonb;
  v_email text := 'vat-'||gen_random_uuid()::text||'@example.invalid';
  lead_id uuid;
begin
  select tenant_id,user_id into t,u from public.tenant_users
  where status='ACTIVE' and role in ('OWNER','ADMIN') order by tenant_id,user_id limit 1;
  if t is null then raise exception 'Test needs an active tenant owner'; end if;
  insert into public.ai4cc_interactions(tenant_id,channel,status,metadata)
  values(t,'voice','open','{"source":"elevenlabs_agent","vat":"rollback"}') returning id into i;

  -- Force the canonical lead RPC to fail after the wrapper updates the interaction.
  begin
    perform public.ai4cc_submit_voice_intake(t,u,i,'invalid',v_email,v_email,'+12025550199','VAT test',null,null,'Test','{}');
    raise exception 'FAIL injected error was accepted';
  exception when invalid_parameter_value then null; end;
  if exists(select 1 from public.ai4cc_interactions where id=i and (status<>'open' or ended_at is not null))
    or exists(select 1 from public.ai4cc_leads where originating_interaction_id=i)
    or exists(select 1 from public.ai4cc_contacts where email=v_email) then
    raise exception 'FAIL partial writes after failure';
  end if;

  r := public.ai4cc_submit_voice_intake(t,u,i,'email',v_email,v_email,'+12025550199','VAT test',null,null,'Test','{}');
  lead_id := (r->'lead'->>'id')::uuid;
  if r->>'replayed' is distinct from 'false' or r->'contact'->>'phone' is distinct from '+12025550199' then raise exception 'FAIL initial submit'; end if;
  if not exists(select 1 from public.ai4cc_interactions where id=i and status='completed' and ended_at is not null) then raise exception 'FAIL completion'; end if;
  replay := public.ai4cc_submit_voice_intake(t,u,i,'email','different@example.invalid','different@example.invalid','+12025550188','Different',null,null,'Different','{}');
  if replay->>'replayed' is distinct from 'true' or (replay->'lead'->>'id')::uuid is distinct from lead_id
     or replay->'contact'->>'email' is distinct from v_email then raise exception 'FAIL replay changed identity'; end if;
  if (select count(*) from public.ai4cc_leads where originating_interaction_id=i)<>1
     or (select count(*) from public.ai4cc_audit_logs where resource_id=lead_id::text and action='lead.created_from_interaction')<>1 then raise exception 'FAIL duplicate lead or audit'; end if;

  insert into public.ai4cc_interactions(tenant_id,channel,status,metadata)
  values(t,'voice','completed','{"source":"elevenlabs_agent","vat":"rollback"}') returning id into legacy;
  r := public.ai4cc_submit_voice_intake(t,u,legacy,'email',v_email,v_email,'+12025550199','VAT test',null,null,'Test','{}');
  if r->>'replayed' is distinct from 'false' then raise exception 'FAIL legacy recovery'; end if;
  begin
    perform public.ai4cc_submit_voice_intake(t,gen_random_uuid(),i,'email',v_email,v_email,null,'Test',null,null,'Test','{}');
    raise exception 'FAIL nonmember accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ai4cc_submit_voice_intake(t,u,gen_random_uuid(),'email',v_email,v_email,null,'Test',null,null,'Test','{}');
    raise exception 'FAIL wrong interaction accepted';
  exception when no_data_found then null; end;
  insert into public.ai4cc_interactions(tenant_id,channel,status,metadata)
  values(t,'chat','open','{"source":"elevenlabs_agent","vat":"rollback"}') returning id into other;
  begin
    perform public.ai4cc_submit_voice_intake(t,u,other,'email',v_email,v_email,null,'Test',null,null,'Test','{}');
    raise exception 'FAIL wrong source accepted';
  exception when invalid_parameter_value then null; end;
end;
$test$;
rollback;
select 'PASS atomic failure rollback, retry, stable replay, single lead and audit, legacy completed recovery, membership denial, wrong interaction denial, source validation; all writes rolled back.' as result;
