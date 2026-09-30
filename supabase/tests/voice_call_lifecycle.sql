-- Administrative connection. Synthetic records roll back.
begin;
set local role service_role;
do $test$
declare
  t uuid; u uuid; r jsonb; i uuid;
  c text := 'conv_vat_'||gen_random_uuid()::text;
  v_email text := 'vat-lifecycle-'||gen_random_uuid()::text||'@example.invalid';
  d jsonb := '{"terminationReason":"Remote party ended call","callDurationSecs":15,"userTurnCount":1,"intakeToolCalled":false}';
  s timestamptz := now()-interval '10 minutes';
  e timestamptz := now()-interval '10 minutes'+interval '15 seconds';
begin
  select tenant_id,user_id into t,u from public.tenant_users
  where status='ACTIVE' and role in ('OWNER','ADMIN') order by tenant_id,user_id limit 1;
  if t is null then raise exception 'Test needs an active tenant owner'; end if;

  -- Early hangup: no intake start ever happened.
  r := public.ai4cc_record_voice_call_event(t,c||'-early','post_call_transcription',s,e,'+17023080000',d);
  i := (r->>'interactionId')::uuid;
  if r->>'created'<>'true' or r->>'outcome'<>'ended_before_intake' then raise exception 'FAIL early hangup result %',r; end if;
  if not exists(select 1 from public.ai4cc_interactions where id=i and tenant_id=t and status='abandoned'
    and external_id=c||'-early' and started_at=s and ended_at=e and customer_identifier='+17023080000'
    and metadata->>'source'='elevenlabs_agent' and metadata->>'intakeOutcome'='not_started'
    and metadata->>'endTimestampSource'='provider'
    and metadata->>'terminationReason'='Remote party ended call') then raise exception 'FAIL early hangup record'; end if;
  if exists(select 1 from public.ai4cc_leads where originating_interaction_id=i) then raise exception 'FAIL fabricated lead'; end if;
  if (select count(*) from public.ai4cc_audit_logs where resource_id=i::text and action='interaction.call_ended')<>1 then raise exception 'FAIL early audit'; end if;

  -- Duplicate delivery: no second write or audit.
  r := public.ai4cc_record_voice_call_event(t,c||'-early','post_call_transcription',s,e,'+17023080000',d);
  if r->>'replayed'<>'true' or (r->>'interactionId')::uuid<>i then raise exception 'FAIL duplicate result %',r; end if;
  if (select count(*) from public.ai4cc_audit_logs where resource_id=i::text)<>1 then raise exception 'FAIL duplicate audit'; end if;
  if (select count(*) from public.ai4cc_interactions where external_id=c||'-early')<>1 then raise exception 'FAIL duplicate interaction'; end if;

  -- Timeout cleanup cannot touch the provider-closed record.
  update public.ai4cc_interactions set started_at=now()-interval '2 hours' where id=i;
  perform public.ai4cc_expire_voice_intakes(t);
  if (select metadata->>'endTimestampSource' from public.ai4cc_interactions where id=i)<>'provider' then raise exception 'FAIL cleanup overwrote provider end'; end if;

  -- Started but unsubmitted intake: closed as incomplete with the provider end time.
  insert into public.ai4cc_interactions(tenant_id,channel,external_id,status,started_at,metadata)
  values(t,'voice',c||'-open','open',s,'{"source":"elevenlabs_agent","vat":"rollback"}') returning id into i;
  r := public.ai4cc_record_voice_call_event(t,c||'-open','post_call_transcription',s,e,null,d);
  if r->>'created'<>'false' or r->>'outcome'<>'intake_incomplete' or (r->>'interactionId')::uuid<>i then raise exception 'FAIL open result %',r; end if;
  if not exists(select 1 from public.ai4cc_interactions where id=i and status='abandoned' and ended_at=e
    and metadata->>'intakeOutcome'='incomplete' and metadata->>'endTimestampSource'='provider') then raise exception 'FAIL open record'; end if;

  -- Out-of-order: a valid submit after the post-call event completes it and keeps the provider end.
  r := public.ai4cc_submit_voice_intake(t,u,i,'email',v_email,v_email,'+12025550199','VAT test',null,null,'Late','{}');
  if r->>'replayed'<>'false' or not exists(select 1 from public.ai4cc_interactions where id=i and status='completed'
    and ended_at=e and metadata->>'intakeOutcome'='submitted_late') then raise exception 'FAIL submit after call end'; end if;
  if (select count(*) from public.ai4cc_leads where originating_interaction_id=i)<>1 then raise exception 'FAIL late lead count'; end if;
  if (select count(*) from public.ai4cc_audit_logs where resource_id=i::text and action='interaction.intake_recovered'
    and payload->>'reason'='submit_after_call_end')<>1 then raise exception 'FAIL late recovery audit'; end if;

  -- Completed intake: status, end time, lead and contact preserved; details attached.
  insert into public.ai4cc_interactions(tenant_id,channel,external_id,status,started_at,customer_identifier,metadata)
  values(t,'voice',c||'-done','open',s,'+12025550111','{"source":"elevenlabs_agent","vat":"rollback"}') returning id into i;
  r := public.ai4cc_submit_voice_intake(t,u,i,'email',v_email,v_email,'+12025550111','VAT test','VAT Co',null,'Done','{}');
  update public.ai4cc_interactions set ended_at=now()-interval '1 minute' where id=i;
  r := public.ai4cc_record_voice_call_event(t,c||'-done','post_call_transcription',s,e,'+17020000000',d);
  if r->>'outcome'<>'details_attached' then raise exception 'FAIL completed result %',r; end if;
  if not exists(select 1 from public.ai4cc_interactions where id=i and status='completed' and ended_at<>e
    and customer_identifier='+12025550111' and metadata->>'callSid' is null and metadata->>'providerEndedAt' is not null)
    then raise exception 'FAIL completed intake changed'; end if;
  if (select count(*) from public.ai4cc_leads where originating_interaction_id=i)<>1 then raise exception 'FAIL completed lead'; end if;

  -- Timeout cleanup ran first: provider time replaces the cleanup time, cleanup time retained.
  insert into public.ai4cc_interactions(tenant_id,channel,external_id,status,started_at,metadata)
  values(t,'voice',c||'-late','open',now()-interval '61 minutes','{"source":"elevenlabs_agent","vat":"rollback"}') returning id into i;
  perform public.ai4cc_expire_voice_intakes(t);
  r := public.ai4cc_record_voice_call_event(t,c||'-late','post_call_transcription',now()-interval '61 minutes',now()-interval '60 minutes',null,d);
  if r->>'outcome'<>'timeout_end_corrected' or not exists(select 1 from public.ai4cc_interactions where id=i and status='abandoned'
    and metadata->>'endTimestampSource'='provider' and metadata ? 'cleanupEndedAt' and metadata->>'intakeTimeoutReason'='submission_timeout')
    then raise exception 'FAIL timeout correction %',r; end if;

  -- Initiation failure without times: failed record, receipt time labelled.
  r := public.ai4cc_record_voice_call_event(t,c||'-fail','call_initiation_failure',null,null,'+17023080000','{"failureReason":"busy"}');
  if r->>'outcome'<>'initiation_failed' or not exists(select 1 from public.ai4cc_interactions
    where id=(r->>'interactionId')::uuid and status='failed' and metadata->>'endTimestampSource'='webhook_receipt')
    then raise exception 'FAIL initiation failure %',r; end if;

  -- Conversation IDs belonging to non-agent interactions are refused untouched.
  insert into public.ai4cc_interactions(tenant_id,channel,external_id,status,metadata)
  values(t,'voice',c||'-other','open','{"source":"other_provider","vat":"rollback"}') returning id into i;
  begin
    perform public.ai4cc_record_voice_call_event(t,c||'-other','post_call_transcription',s,e,null,d);
    raise exception 'FAIL foreign source accepted';
  exception when invalid_parameter_value then null; end;
  if (select status from public.ai4cc_interactions where id=i)<>'open' then raise exception 'FAIL foreign source changed'; end if;

  -- Unexpected detail keys and event types are rejected.
  begin
    perform public.ai4cc_record_voice_call_event(t,c||'-bad','post_call_transcription',s,e,null,'{"callerName":"x"}');
    raise exception 'FAIL detail key accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ai4cc_record_voice_call_event(t,c||'-bad','post_call_audio',s,e,null,'{}');
    raise exception 'FAIL event type accepted';
  exception when invalid_parameter_value then null; end;

end;
$test$;
rollback;
select 'PASS early hangup record without lead, one audit, duplicate replay, cleanup protection, incomplete intake close, submit after call end, completed intake preserved, timeout end correction, initiation failure, foreign source refusal, input validation; writes rolled back.' as result;
