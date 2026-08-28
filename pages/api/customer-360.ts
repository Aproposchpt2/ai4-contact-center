// @ts-nocheck
import type { NextApiRequest, NextApiResponse } from 'next';
import { apiErrorMessage, apiErrorStatus, requireAi4ccContext } from '@/lib/ai4ccServer';

const text=(v:any)=>typeof v==='string'?v.trim():'';
const validUuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function normalizePhone(value:any){const raw=String(value||'').trim();if(!raw)return '';const digits=raw.replace(/\D/g,'');if(raw.startsWith('+'))return `+${digits}`;if(digits.length===10)return `+1${digits}`;if(digits.length===11&&digits.startsWith('1'))return `+${digits}`;return digits;}

export default async function handler(req:NextApiRequest,res:NextApiResponse){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const {admin,tenantId}=await requireAi4ccContext(req);
    const contactId=text(req.query.contactId);
    if(!contactId){
      const {data,error}=await admin.from('ai4cc_contacts').select('id,first_name,last_name,display_name,company_name,email,phone,preferred_channel,lead_source,lead_score,priority,sms_consent,email_consent,do_not_contact,tags,metadata,created_at,updated_at').eq('tenant_id',tenantId).order('updated_at',{ascending:false}).limit(500);
      if(error)throw error;return res.status(200).json({contacts:data||[]});
    }
    if(!validUuid(contactId))return res.status(400).json({error:'A valid contactId is required'});
    const {data:contact,error:contactError}=await admin.from('ai4cc_contacts').select('id,first_name,last_name,display_name,company_name,email,phone,preferred_channel,lead_source,lead_score,priority,sms_consent,email_consent,do_not_contact,tags,metadata,created_at,updated_at').eq('tenant_id',tenantId).eq('id',contactId).maybeSingle();
    if(contactError)throw contactError;if(!contact)return res.status(404).json({error:'Contact not found'});

    const [leadResult,activityResult,taskResult]=await Promise.all([
      admin.from('ai4cc_leads').select('id,title,service_interest,pipeline_stage,status,priority,score,estimated_value,probability,expected_close_date,assigned_agent_id,next_action,next_follow_up,last_contacted_at,converted_at,lost_reason,originating_interaction_id,originating_channel,updated_at,assigned_agent:ai4cc_agents!ai4cc_leads_assigned_agent_id_fkey(id,name,email,status)').eq('tenant_id',tenantId).eq('contact_id',contactId).order('updated_at',{ascending:false}),
      admin.from('ai4cc_lead_activities').select('id,lead_id,interaction_id,activity_type,direction,subject,body,outcome,actor_agent_id,created_at,actor_agent:ai4cc_agents(id,name,email,status)').eq('tenant_id',tenantId).eq('contact_id',contactId).order('created_at',{ascending:false}).limit(250),
      admin.from('ai4cc_lead_tasks').select('id,lead_id,title,description,task_type,due_at,priority,status,assigned_agent_id,completed_at,updated_at,assigned_agent:ai4cc_agents(id,name,email,status)').eq('tenant_id',tenantId).eq('contact_id',contactId).order('updated_at',{ascending:false}).limit(250),
    ]);
    if(leadResult.error||activityResult.error||taskResult.error)throw leadResult.error||activityResult.error||taskResult.error;
    const leads=leadResult.data||[];const interactionMap=new Map();const originIds=leads.map((x:any)=>x.originating_interaction_id).filter(Boolean);
    if(originIds.length){const q=await admin.from('ai4cc_interactions').select('id,channel,direction,external_id,customer_identifier,status,started_at,ended_at,metadata,queue_id,agent_id').eq('tenant_id',tenantId).in('id',originIds).order('started_at',{ascending:false});if(q.error)throw q.error;(q.data||[]).forEach((x:any)=>interactionMap.set(x.id,x));}
    const identifiers=[] as string[];if(contact.email)identifiers.push(String(contact.email).trim().toLowerCase());const phone=normalizePhone(contact.phone);if(phone)identifiers.push(phone);
    for(const identifier of identifiers){let q=admin.from('ai4cc_interactions').select('id,channel,direction,external_id,customer_identifier,status,started_at,ended_at,metadata,queue_id,agent_id').eq('tenant_id',tenantId).order('started_at',{ascending:false}).limit(100);q=identifier.includes('@')?q.ilike('customer_identifier',identifier):q.eq('customer_identifier',identifier);const r=await q;if(r.error)throw r.error;(r.data||[]).forEach((x:any)=>interactionMap.set(x.id,x));}
    const interactions=[...interactionMap.values()].sort((a:any,b:any)=>new Date(b.started_at||0).getTime()-new Date(a.started_at||0).getTime());
    const queueIds=[...new Set(interactions.map((x:any)=>x.queue_id).filter(Boolean))];const agentIds=[...new Set(interactions.map((x:any)=>x.agent_id).filter(Boolean))];
    const queues=new Map(),agents=new Map();
    if(queueIds.length){const r=await admin.from('ai4cc_queues').select('id,name,code').eq('tenant_id',tenantId).in('id',queueIds);if(r.error)throw r.error;(r.data||[]).forEach((x:any)=>queues.set(x.id,x));}
    if(agentIds.length){const r=await admin.from('ai4cc_agents').select('id,name,email,status').eq('tenant_id',tenantId).in('id',agentIds);if(r.error)throw r.error;(r.data||[]).forEach((x:any)=>agents.set(x.id,x));}
    const hydrated=interactions.map((x:any)=>({...x,queue:x.queue_id?queues.get(x.queue_id)||null:null,agent:x.agent_id?agents.get(x.agent_id)||null:null}));
    const openLeads=leads.filter((x:any)=>!['converted','lost'].includes(x.pipeline_stage));const tasks=taskResult.data||[];const openTasks=tasks.filter((x:any)=>!['completed','cancelled'].includes(x.status));
    const pipelineValue=openLeads.reduce((s:number,x:any)=>s+Number(x.estimated_value||0),0);const weightedValue=openLeads.reduce((s:number,x:any)=>s+Number(x.estimated_value||0)*Number(x.probability||0)/100,0);
    const channels=hydrated.reduce((a:any,x:any)=>{const k=String(x.channel||'unknown').toLowerCase();a[k]=(a[k]||0)+1;return a;},{});
    return res.status(200).json({contact,leads,activities:activityResult.data||[],tasks,interactions:hydrated,summary:{openLeads:openLeads.length,openTasks:openTasks.length,pipelineValue,weightedValue,interactionCount:hydrated.length,lastInteractionAt:hydrated[0]?.started_at||null,channels}});
  }catch(error){return res.status(apiErrorStatus(error)).json({error:apiErrorMessage(error)});}
}
