import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {readiness,submitStagingSupport}=require('../twilio-bridge/staging-support-intake.cjs');
const env={RAILWAY_ENVIRONMENT_NAME:'staging',STAGING_SUPPORT_WRITES_ENABLED:'true',
 STAGING_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',CSS_TENANT_ID:'5885a020-d363-4c27-910a-c035eda132f5',STAGING_SUPABASE_SERVICE_ROLE_KEY:'fictional-test-key'};
const args={name:'Fictional Support Tester',email:'support-test@example.invalid',phone:'+12025550199',product:'Fictional Device',
 purchaseDate:'2026-10-10',issue:'Fictional device disconnects repeatedly.',steps:'Restarted once',impact:'Fictional work interrupted',priority:'HIGH'};
const call='CA00000000000000000000000000000001';
const row={customer_id:'11111111-1111-4111-8111-111111111111',case_id:'22222222-2222-4222-8222-222222222222',created_new:true};
test('staging persistence requires an explicit switch, exact project, tenant and credential',async()=>{
 for(const patch of [{RAILWAY_ENVIRONMENT_NAME:'production'},{STAGING_SUPPORT_WRITES_ENABLED:'false'},
 {STAGING_SUPABASE_URL:'https://vqrqyanqsiqzsmlhytaz.supabase.co'},{CSS_TENANT_ID:'other'},{STAGING_SUPABASE_SERVICE_ROLE_KEY:''}]) {
  let requests=0;const settings={...env,...patch};assert.notEqual(readiness(settings),'READY');
  await assert.rejects(submitStagingSupport(args,call,settings,async()=>{requests++;}));assert.equal(requests,0);
 }
});
test('staging write uses server call identity, target and non-notifying verified result',async()=>{
 let count=0;
 const result=await submitStagingSupport(args,call,env,async(url:any,opts:any)=>{
  count++;assert.equal(url,'https://hvzauakkhlivzeqatfqm.supabase.co/rest/v1/rpc/stellar_create_phone_support_test_intake');
  const body=JSON.parse(opts.body);assert.equal(body.p_tenant_id,env.CSS_TENANT_ID);assert.equal(body.p_session_id,'phone-staging:'+call);
  assert.equal(body.p_name,args.name);return{ok:true,json:async()=>[row]};
 });
 assert.equal(count,1);assert.equal(result.success,true);assert.equal(result.caseId,row.case_id);
 assert.equal(result.testOnly,true);assert.equal(result.notificationSent,false);assert.equal(result.technicianFollowupConfirmed,false);
});
test('invalid and injected tool arguments never reach the database',async()=>{
 for(const bad of [null,[],{...args,tenantId:'other'},{...args,callSid:call},{...args,name:''},{...args,issue:'short'},
 {...args,purchaseDate:'2026-02-31'},{...args,priority:'ADMIN'},{...args,steps:'x'.repeat(2001)}]) {
  let requests=0;await assert.rejects(submitStagingSupport(bad,call,env,async()=>{requests++;}));assert.equal(requests,0);
 }
 await assert.rejects(submitStagingSupport(args,'spoofed-call',env));
});
test('save errors and ambiguous results never return success or retry a timed-out write',async()=>{
 const responses=[{ok:false,json:async()=>[row]},{ok:true,json:async()=>[]},{ok:true,json:async()=>[row,row]},
 {ok:true,json:async()=>[{...row,case_id:null}]},{ok:true,json:async()=>{throw Error('parse');}}];
 for(const response of responses){let count=0;await assert.rejects(submitStagingSupport(args,call,env,async()=>{count++;return response;}),/STAGING_SAVE_NOT_CONFIRMED/);assert.equal(count,1);}
 let count=0;await assert.rejects(submitStagingSupport(args,call,env,async()=>{count++;throw Error('secret-containing error');}),/STAGING_SAVE_NOT_CONFIRMED/);assert.equal(count,1);
});
test('duplicate RPC result preserves the existing ticket identifier',async()=>{
 const r=await submitStagingSupport(args,call,env,async()=>({ok:true,json:async()=>[{...row,created_new:false}]}));
 assert.equal(r.caseId,row.case_id);assert.equal(r.createdNew,false);assert.equal(r.success,true);
});
