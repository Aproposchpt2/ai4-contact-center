export type RuntimeQueue = { id:string; name:string; code:string; channel?:string|null; skills?:string[]|null; priority?:number|null; capacity?:number|null; overflow_queue_id?:string|null; status?:string|null };
export type RuntimeAgent = { id:string; name:string; email?:string|null; status?:string|null; skills?:string[]|null; channels?:string[]|null };
export type RuntimeRoutingDecision = { queue:RuntimeQueue|null; agent:RuntimeAgent|null; overflowUsed:boolean; estimatedWaitSeconds:number; reason:string; candidates:Array<{queueId:string;queueCode:string;score:number;active:number;capacity:number}> };

function channelCompatible(queueChannel:string|null|undefined, channel:string) { const q=(queueChannel||'omnichannel').toLowerCase(); return q==='omnichannel'||q==='all'||q===channel.toLowerCase(); }
function agentChannelCompatible(channels:string[]|null|undefined, channel:string) { if(!channels||channels.length===0)return true; const n=channels.map(c=>c.toLowerCase()); return n.includes('omnichannel')||n.includes('all')||n.includes(channel.toLowerCase()); }
function skillScore(skills:string[]|null|undefined, intent:string) { const n=(skills||[]).map(s=>s.toLowerCase()); if(n.includes(intent.toLowerCase()))return 100; if(n.includes('general_support'))return 30; if(n.length===0)return 10; return 0; }

export function selectRuntimeRoute(input:{channel:string;intent:string;queues:RuntimeQueue[];agents:RuntimeAgent[];activeByQueue?:Record<string,number>}):RuntimeRoutingDecision {
  const activeByQueue=input.activeByQueue||{};
  const queues=input.queues.filter(q=>q.status!=='inactive'&&channelCompatible(q.channel,input.channel));
  const scored=queues.map(queue=>{ const active=activeByQueue[queue.id]||0; const capacity=Math.max(1,queue.capacity||1); const score=skillScore(queue.skills,input.intent)+((queue.channel||'').toLowerCase()===input.channel.toLowerCase()?20:15)+Math.max(0,capacity-active)*2+(queue.priority||0)-(active>=capacity?1000:0); return {queue,active,capacity,score}; }).sort((a,b)=>b.score-a.score||(b.queue.priority||0)-(a.queue.priority||0));
  let selected=scored[0]||null; let overflowUsed=false;
  if(selected&&selected.active>=selected.capacity&&selected.queue.overflow_queue_id){ const overflow=queues.find(q=>q.id===selected!.queue.overflow_queue_id)||null; if(overflow){ const active=activeByQueue[overflow.id]||0; const capacity=Math.max(1,overflow.capacity||1); selected={queue:overflow,active,capacity,score:skillScore(overflow.skills,input.intent)+15+(overflow.priority||0)}; overflowUsed=true; } }
  const queue=selected?.queue||null;
  const agent=input.agents.filter(a=>a.status==='available').filter(a=>agentChannelCompatible(a.channels,input.channel)).map(a=>({agent:a,score:skillScore(a.skills,input.intent)+20})).sort((a,b)=>b.score-a.score)[0]?.agent||null;
  const utilization=selected?selected.active/selected.capacity:1;
  return { queue, agent, overflowUsed, estimatedWaitSeconds:selected?Math.max(0,Math.round(utilization*45)):60, reason:queue?`Runtime optimizer selected ${queue.name} for ${input.intent} on ${input.channel}${agent?` and assigned ${agent.name}`:'; no available agent matched'}.`:`Runtime optimizer found no eligible queue for ${input.intent} on ${input.channel}.`, candidates:scored.map(i=>({queueId:i.queue.id,queueCode:i.queue.code,score:i.score,active:i.active,capacity:i.capacity})) };
}
