import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../twilio-bridge/server.js', import.meta.url), 'utf8').replace(/start\(\);\s*$/, 'globalThis.handleCall = handleCall; globalThis.wsPool = wsPool;');
async function session(profile, failSave = false, warm = false, staging = false, supportSave:any = null) {
  const outbound:any[] = [], requests:any[] = [], sockets:any[] = [], phoneOutbound:any[] = [];
  class Socket extends EventEmitter {
    static OPEN = 1; readyState = 1;
    constructor(..._args:any[]) { super(); sockets.push(this); queueMicrotask(()=>this.emit('open')); }
    send(raw:string) { outbound.push(JSON.parse(raw)); }
    close() { this.readyState=3; }
  }
  const timers:any[]=[];
  const context:any = { require:(n:string)=>n==='./staging-support-intake.cjs'?{readiness:()=> 'STAGING_WRITES_DISABLED',submitStagingSupport:async()=>{if(supportSave)return supportSave();throw new Error('STAGING_WRITES_DISABLED');}}:n==='express'?()=>({}):n==='ws'?{WebSocket:Socket,WebSocketServer:class{}}:require(n), console:{log(){},error(){}}, process:{env:{OPENAI_API_KEY:'mock',BRIDGE_HMAC_SECRET:'mock',NETLIFY_BASE_URL:'https://staging.invalid',RAILWAY_ENVIRONMENT_NAME:staging?'staging':'test'}}, Buffer, URL, AbortSignal, setTimeout:(fn:any,ms:number)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},setInterval:(fn:any,ms:number)=>{timers.push({fn,ms,interval:true});return timers.length;},clearInterval:(id:number)=>{if(timers[id-1])timers[id-1].cleared=true;},fetch:async(url:string,opts:any)=>{
    const body=JSON.parse(opts.body); requests.push(body);
    return {ok:true,json:async()=>body.action==='start'?{interactionId:'fictional-interaction',transferAllowed:'yes',knownCallerName:'Test'}:failSave?{}:{lead:{id:'fictional-lead'}}};
  }};
  vm.runInNewContext(source,context);
  const phone:any=new EventEmitter(); phone.readyState=1;phone.send=(raw:string)=>phoneOutbound.push(JSON.parse(raw));phone.close=()=>{phone.readyState=3;};
  if(warm){const pooled:any=new Socket();pooled._poolReady=true;context.wsPool.push(pooled);}
  await context.handleCall(phone,profile,'+12025550199','TEST_CALL');
  phone.emit('message',Buffer.from(JSON.stringify({event:'start',start:{streamSid:'TEST_STREAM'}})));
  const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();}; await flush();
  const ws=sockets[0];
  const tool=async(id:string,name:string,args:any={},envelope=false)=>{const event=staging && profile==='support'?{type:'response.output_item.done',item:{type:'function_call',call_id:id,name,arguments:JSON.stringify(args)}}:{type:'response.function_call_arguments.done',call_id:id,name,arguments:JSON.stringify(args)};ws.emit('message',Buffer.from(JSON.stringify(envelope?{type:'response.event',event}:event)));await flush();};
  return {outbound,requests,phone,ws,tool,timers,phoneOutbound};
}
test('sales transport registers sales tools and initializes the interaction',async()=>{
 const s=await session('sales'); const start=s.outbound.find(x=>x.type==='session.start');
 assert.ok(start.session.delegation.responses.tools.some((x:any)=>x.name==='submit_business_profile'));
 assert.ok(!start.session.delegation.responses.tools.some((x:any)=>x.name==='submit_support_intake'));
 assert.equal(s.requests[0].action,'start');
 await s.tool('early','transfer_to_specialist');
 assert.match(s.outbound.find(x=>x.item?.call_id==='early').item.output,/not been saved/);
 await s.tool('save','submit_business_profile',{description:'Fictional inquiry'});
 assert.match(s.outbound.find(x=>x.item?.call_id==='save').item.output,/fictional-lead/);
 await s.tool('repeat','submit_business_profile');
 assert.equal(s.requests.filter(x=>x.action==='submit').length,1);
 await s.tool('transfer','transfer_to_specialist');
 assert.deepEqual(JSON.parse(s.outbound.find(x=>x.item?.call_id==='transfer').item.output),{success:true});
});
test('unconfirmed persistence never authorizes a transfer',async()=>{
 const s=await session('sales',true); await s.tool('save','submit_business_profile');await s.tool('transfer','transfer_to_specialist');
 assert.match(s.outbound.find(x=>x.item?.call_id==='save').item.output,/not confirmed/);
 assert.match(s.outbound.find(x=>x.item?.call_id==='transfer').item.output,/not been saved/);
});
test('support transport retains its support tools and disconnect cleanup',async()=>{
 const s=await session('support');assert.equal(s.requests.length,0);
 assert.ok(s.outbound.find(x=>x.type==='session.start').session.delegation.responses.tools.some((x:any)=>x.name==='submit_support_intake'));
 s.phone.emit('message',Buffer.from(JSON.stringify({event:'stop'})));assert.equal(s.ws.readyState,3);
});

test('delegated envelope executes once and rejects non-object arguments',async()=>{
 const s=await session('sales');await s.tool('envelope','submit_business_profile',{description:'Fictional inquiry'},true);await s.tool('envelope','submit_business_profile',{},true);
 assert.equal(s.requests.filter(x=>x.action==='submit').length,1);
 await s.tool('invalid','end_call',null,true);
 assert.match(s.outbound.find(x=>x.item?.call_id==='invalid').item.output,/Invalid tool arguments/);
 assert.equal(s.timers.filter(x=>x.ms===1500).length,0);
});

const oai=(s:any,event:any)=>s.ws.emit('message',Buffer.from(JSON.stringify(event)));
const phoneEvent=(s:any,event:any)=>s.phone.emit('message',Buffer.from(JSON.stringify(event)));
const acknowledgeGreeting=(s:any)=>phoneEvent(s,{event:'mark',streamSid:'TEST_STREAM',mark:{name:'stellar-greeting-start'}});
test('silent caller gets seeded greeting context without starting backend work',async()=>{
 for(const warm of [false,true]){
 const s=await session('support',false,warm);
 oai(s,{type:'session.started'});oai(s,{type:'session.started'});
 assert.equal(s.outbound.filter(x=>x.type==='response.create').length,0);
 const start=s.outbound.find(x=>x.type==='session.start');
 assert.equal(start.session.input[0].role,'developer');
 assert.match(start.session.input[0].content[0].text,/immediately/);
 assert.equal(s.timers.filter(x=>x.interval).length,1);
 s.timers.find(x=>x.interval).fn();
 const input=s.outbound.filter(x=>x.type==='session.input_audio.append');
 assert.equal(input.length,1);
 assert.deepEqual(Buffer.from(input[0].audio,'base64'),Buffer.alloc(160,255));
 }
});
test('early caller speech cannot cancel greeting before playback; queued input survives',async()=>{
 const s=await session('support');
 phoneEvent(s,{event:'media',media:{payload:'AQID'}});
 oai(s,{type:'session.started'});
 phoneEvent(s,{event:'media',media:{payload:'BAUG'}});
 oai(s,{type:'session.speech_started'});
 assert.equal(s.outbound.filter(x=>x.type==='response.cancel').length,0);
 assert.equal(s.outbound.filter(x=>x.type==='session.input_audio.append').length,0);
 acknowledgeGreeting(s); // unsolicited mark cannot release input
 assert.equal(s.outbound.filter(x=>x.type==='session.input_audio.append').length,0);
 oai(s,{type:'session.output_audio.delta',delta:'BwgJ'});
 assert.deepEqual(s.phoneOutbound.map(x=>x.event),['media','mark']);
 phoneEvent(s,{event:'mark',streamSid:'OTHER_STREAM',mark:{name:'stellar-greeting-start'}});
 assert.equal(s.outbound.filter(x=>x.type==='session.input_audio.append').length,0);
 acknowledgeGreeting(s);acknowledgeGreeting(s);
 assert.deepEqual(s.outbound.filter(x=>x.type==='session.input_audio.append').map(x=>x.audio),['AQID','BAUG']);
 assert.equal(s.timers.find(x=>x.interval).cleared,true);
 oai(s,{type:'session.speech_started'});
 assert.equal(s.outbound.filter(x=>x.type==='response.cancel').length,1);
 assert.equal(s.phoneOutbound.at(-1).event,'clear');
 phoneEvent(s,{event:'media',media:{payload:'CgsM'}});
 assert.equal(s.outbound.at(-1).audio,'CgsM');
});
test('missing greeting or playback acknowledgement terminates startup',async()=>{
 for(const audio of [false,true]){
  const s=await session('support');oai(s,{type:'session.started'});
  if(audio)oai(s,{type:'session.output_audio.delta',delta:'AQID'});
  s.timers.find(x=>x.ms===10000).fn();
  assert.equal(s.phone.readyState,3);assert.equal(s.ws.readyState,3);
  assert.equal(s.timers.find(x=>x.interval).cleared,true);
  const count=s.outbound.length;oai(s,{type:'session.started'});
  assert.equal(s.outbound.length,count);
 }
});
test('startup audio overflow fails explicitly instead of silently dropping speech',async()=>{
 const s=await session('support');
 phoneEvent(s,{event:'media',media:{payload:Buffer.alloc(80001).toString('base64')}});
 assert.equal(s.phone.readyState,3);assert.equal(s.ws.readyState,3);
});

test('caller disconnect before session ready prevents a late greeting',async()=>{
 const s=await session('support');
 phoneEvent(s,{event:'stop'});
 const count=s.outbound.length;
 oai(s,{type:'session.started'});
 oai(s,{type:'session.output_audio.delta',delta:'AQID'});
 assert.equal(s.outbound.length,count);assert.equal(s.phoneOutbound.length,0);
});

test('Railway staging blocks intake writes, notifications and external transfers',async()=>{
 for(const profile of ['support','sales']){
  const s=await session(profile,false,false,true);
  await s.tool('support-write','submit_support_intake',{name:'Fictional'});
  await s.tool('sales-write','submit_business_profile',{});
  await s.tool('transfer','transfer_to_specialist',{});
  await s.tool('end','end_call',{});
  for(const timer of s.timers.filter(x=>x.ms===1500||x.ms===1000))timer.fn();
  await Promise.resolve();
  assert.equal(s.requests.length,0);
  assert.match(s.outbound.find(x=>x.item?.call_id==='support-write').item.output,/STAGING_WRITES_DISABLED/);
  assert.match(s.outbound.find(x=>x.item?.call_id==='transfer').item.output,/STAGING_TRANSFERS_DISABLED/);
 }
});
test('staging Support adds the fixed opening while preserving the approved models and persona',async()=>{
 const s=await session('support',false,false,true);
 const start=s.outbound.find(x=>x.type==='session.start').session;
 const approved=JSON.parse(readFileSync(new URL('./fixtures/approved-support-persona.json',import.meta.url),'utf8'));
 assert.equal(start.model,'gpt-live-1');
 assert.equal(start.delegation.responses.model,'gpt-5.6-terra');
 const greeting = 'Hello, you have reached Stellar Technologies Support Desk. Who do I have the pleasure of speaking with?';
 const prefix = `At the start of this telephone call, say exactly: "${greeting}" Then pause and wait for the caller's name. Do not repeat this opening later in the call. After the caller responds, continue naturally using the support instructions below.\n\n`;
 // Frozen original persona remains intact; owner-approved workflow is a separate suffix.
 assert.ok(start.instructions.startsWith(prefix+approved.brief));
 assert.ok(start.delegation.responses.instructions.startsWith(prefix+approved.instructions));
 assert.equal(start.instructions.slice((prefix+approved.brief).length),start.delegation.responses.instructions.slice((prefix+approved.instructions).length));
 assert.equal(start.turn_detection,undefined);
 assert.equal(start.audio.output?.voice,undefined);
 const intake=start.delegation.responses.tools.find((x:any)=>x.name==='submit_support_intake');
 assert.equal(intake.parameters.required.length,9);
});

test('restoring the persona retains the current staging telephone greeting transport',async()=>{
 const s=await session('support',false,false,true);
 const start=s.outbound.find(x=>x.type==='session.start').session;
 assert.equal(start.input,undefined);
 oai(s,{type:'session.started'});oai(s,{type:'session.started'});
 assert.equal(s.outbound.filter(x=>x.type==='response.create').length,1);
 assert.equal(s.timers.filter(x=>x.interval).length,1);
});


test('staging Support preserves full-duplex acknowledgments without cancelling backend work',async()=>{
 const s=await session('support',false,false,true);
 oai(s,{type:'session.started'});
 oai(s,{type:'session.output_audio.delta',delta:'AQID'});acknowledgeGreeting(s);
 oai(s,{type:'session.speech_started'});
 oai(s,{type:'input_audio_buffer.speech_started'});
 assert.equal(s.outbound.filter(x=>x.type==='response.cancel').length,0);
 assert.equal(s.phoneOutbound.filter(x=>x.event==='clear').length,0);
 phoneEvent(s,{event:'media',media:{payload:'BAUG'}});
 assert.equal(s.outbound.at(-1).audio,'BAUG');
 oai(s,{type:'session.output_audio.delta',delta:'BwgJ'});
 assert.equal(s.phoneOutbound.at(-1).media.payload,'BwgJ');
});

test('staging Support waits for complete delegated tool items and returns one correlated result',async()=>{
 const s=await session('support',false,false,true);
 oai(s,{type:'response.event',event:{type:'response.function_call_arguments.done',item_id:'partial',arguments:'{}'}});
 assert.equal(s.outbound.filter(x=>x.type==='response.item.create').length,0);
 await s.tool('confirmed-call','submit_support_intake',{name:'Fictional'},true);
 await s.tool('confirmed-call','submit_support_intake',{name:'Fictional'},true);
 const results=s.outbound.filter(x=>x.type==='response.item.create');
 assert.equal(results.length,1);
 assert.equal(results[0].item.call_id,'confirmed-call');
 assert.match(results[0].item.output,/STAGING_WRITES_DISABLED/);
 assert.equal(s.requests.length,0);
});


test('pending support save receives progress but no success until persistence resolves',async()=>{
 let resolveSave:any;
 const saved=new Promise(resolve=>{resolveSave=resolve;});
 const s=await session('support',false,false,true,()=>saved);
 await s.tool('pending-save','submit_support_intake',{},true);
 const progress=s.timers.find(x=>x.ms===4000);assert.ok(progress);
 progress.fn();
 assert.ok(s.outbound.some(x=>x.type==='session.commentary.append' && /still waiting/.test(x.content)));
 assert.equal(s.outbound.filter(x=>x.type==='session.thinking.append').length,0);
 const caseId='11111111-1111-4111-8111-111111111111';
 resolveSave({success:true,caseId,customerId:'22222222-2222-4222-8222-222222222222'});
 for(let i=0;i<12;i++)await Promise.resolve();
 const factual=s.outbound.findIndex(x=>x.type==='session.thinking.append');
 const result=s.outbound.findIndex(x=>x.item?.call_id==='pending-save');
 assert.ok(factual>=0 && factual<result);
 assert.match(s.outbound[factual].content,new RegExp(caseId));
 assert.ok(s.outbound.some(x=>x.type==='session.instructions.append' && /Wait for readiness/.test(x.content)));
 const count=s.outbound.length;progress.fn();assert.equal(s.outbound.length,count);
});
test('failed and disconnected support saves cannot emit stale success or pending reminders',async()=>{
 const failed=await session('support',false,false,true,()=>Promise.reject(Error('SAVE_NOT_CONFIRMED')));
 await failed.tool('failed-save','submit_support_intake',{},true);
 assert.equal(failed.outbound.filter(x=>x.type==='session.thinking.append').length,0);
 assert.ok(failed.outbound.some(x=>x.type==='session.instructions.append' && /no ticket was confirmed/.test(x.content)));
 const count=failed.outbound.length;failed.timers.find(x=>x.ms===4000).fn();assert.equal(failed.outbound.length,count);
 let resolveSave:any;const saved=new Promise(resolve=>{resolveSave=resolve;});
 const gone=await session('support',false,false,true,()=>saved);
 await gone.tool('disconnected-save','submit_support_intake',{},true);
 phoneEvent(gone,{event:'stop'});
 const before=gone.outbound.length;gone.timers.find(x=>x.ms===4000).fn();
 resolveSave({success:true,caseId:'11111111-1111-4111-8111-111111111111'});
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.equal(gone.outbound.length,before);
});


test('missed Support delegation gets one backend review after caller inactivity',async()=>{
 const s=await session('support',false,false,true);
 oai(s,{type:'session.started'});
 oai(s,{type:'session.output_audio.delta',delta:'AQID'});acknowledgeGreeting(s);
 oai(s,{type:'response.completed'});
 oai(s,{type:'session.input_transcript.delta',delta:'Fictional caller confirmation'});
 const review=s.timers.filter(x=>x.ms===15000).at(-1);
 const count=s.outbound.filter(x=>x.type==='response.create').length;
 review.fn();review.fn();
 assert.equal(s.outbound.filter(x=>x.type==='response.create').length,count+1);
 assert.equal(s.outbound.filter(x=>x.type==='response.item.create').length,0);
 assert.equal(s.requests.length,0);
});
test('Support review does not duplicate active backend work or run after disconnect',async()=>{
 const s=await session('support',false,false,true);
 oai(s,{type:'session.started'});oai(s,{type:'session.output_audio.delta',delta:'AQID'});acknowledgeGreeting(s);
 oai(s,{type:'response.created'});
 oai(s,{type:'session.input_transcript.delta',delta:'Additional fictional detail'});
 const count=s.outbound.filter(x=>x.type==='response.create').length;
 s.timers.filter(x=>x.ms===15000).at(-1).fn();
 assert.equal(s.outbound.filter(x=>x.type==='response.create').length,count);
 oai(s,{type:'response.completed'});
 s.timers.filter(x=>x.ms===5000).at(-1).fn();
 assert.equal(s.outbound.filter(x=>x.type==='response.create').length,count+1);
 oai(s,{type:'session.input_transcript.delta',delta:'Goodbye'});
 phoneEvent(s,{event:'stop'});
 const after=s.outbound.length;s.timers.filter(x=>x.ms===15000).at(-1).fn();
 assert.equal(s.outbound.length,after);
});
