-- Run as an administrative database role. Synthetic records are rolled back.
begin;
do $test$
declare
  t uuid;
  actor uuid;
  interaction uuid;
  contact uuid;
  result jsonb;
  test_email text := 'vat-' || gen_random_uuid()::text || '@example.invalid';
  n integer;
begin
  select tenant_id,user_id into t,actor from public.tenant_users where status='ACTIVE' order by tenant_id,user_id limit 1;
  if t is null then raise exception 'Test requires an active tenant member'; end if;
  for n in 1..4 loop
    if n=2 then
      update public.ai4cc_contacts set phone=null where id=contact;
    end if;
    insert into public.ai4cc_interactions(tenant_id,channel,direction,status,ended_at,metadata)
    values(t,'voice','inbound','completed',now(),'{"source":"rollback_regression_test"}')
    returning id into interaction;
    result := public.ai4cc_create_lead_from_interaction(
      t,actor,interaction,case when n=4 then 'phone' else 'email' end,
      case when n=4 then '+12025550199' else test_email end,
      test_email,case when n=3 then '+12025550198' else '+12025550199' end,
      'Rollback regression test',null,'Callback persistence regression',null,null,
      'new','normal',50,0,0,'Test only',null);
    if n=1 then contact := (result->'contact'->>'id')::uuid; end if;
    if (result->'contact'->>'id')::uuid is distinct from contact
       or (result->'contact'->>'email') is distinct from test_email
       or (result->'contact'->>'phone') is distinct from '+12025550199' then
      raise exception 'contact persistence assertion failed for case %: %',n,result->'contact';
    end if;
  end loop;
end $test$;
rollback;
select 'PASS: new email contact retains phone; existing email contact fills missing phone; populated phone preserved; phone identity retains email. All test writes rolled back.' as result;