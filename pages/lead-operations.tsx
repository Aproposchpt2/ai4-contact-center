'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Agent={id:string;name:string;email:string|null;status:string};
type Lead={id:string;title:string;pipeline_stage:string;status:string;assigned_agent_id:string|null;updated_at:string;contact?:{display_name:string|null;company_name:string|null;email:string|null;phone:string|null}|null;assigned_agent?:Agent|null};
type Activity={id:string;activity_type:string;direction:string|null;subject:string|null;body:string|null;outcome:string|null;created_at:string;actor_agent?:Agent|null};
type Task={id:string;title:string;description:string|null;task_type:string;due_at:string|null;priority:string;status:string;assigned_agent_id:string|null;completed_at:string|null;updated_at:string;assigned_agent?:Agent|null};

const PRIVILEGED=new Set(['owner','admin','supervisor']);
const TASK_STATUSES=['pending','in_progress','completed','cancelled'];
const PRIORITIES=['low','normal','high','urgent'];

function localDateTime(value:string|null){
  if(!value)return '';
  const d=new Date(value); if(Number.isNaN(d.getTime()))return '';
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}

export default function LeadOperationsPage(){
  const router=useRouter();
  const [leads,setLeads]=useState<Lead[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [activities,setActivities]=useState<Activity[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [agents,setAgents]=useState<Agent[]>([]);
  const [role,setRole]=useState('');
  const [actorAgentId,setActorAgentId]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [lastUpdated,setLastUpdated]=useState('');
  const [activityType,setActivityType]=useState('note');
  const [activityDirection,setActivityDirection]=useState('internal');
  const [activitySubject,setActivitySubject]=useState('');
  const [activityBody,setActivityBody]=useState('');
  const [activityOutcome,setActivityOutcome]=useState('');
  const [taskTitle,setTaskTitle]=useState('');
  const [taskDescription,setTaskDescription]=useState('');
  const [taskType,setTaskType]=useState('follow_up');
  const [taskDue,setTaskDue]=useState('');
  const [taskPriority,setTaskPriority]=useState('normal');
  const [taskAgent,setTaskAgent]=useState('');

  async function authHeaders(){
    if(!supabase)return null;
    const {data:{session}}=await supabase.auth.getSession();
    return session?{Authorization:`Bearer ${session.access_token}`} : null;
  }

  async function loadLeads(){
    if(!isSupabaseConfigured()||!supabase)throw new Error('Canonical Supabase configuration is required.');
    const h=await authHeaders(); if(!h){await router.replace('/login');return null;}
    const r=await fetch('/api/lead-management',{headers:h});
    const d=await r.json(); if(!r.ok)throw new Error(d.error||'Unable to load Leads');
    const rows:Lead[]=d.leads||[];
    setLeads(rows);
    const requested=typeof router.query.leadId==='string'?router.query.leadId:'';
    const next=(requested&&rows.some(x=>x.id===requested)?requested:'') || (selectedId&&rows.some(x=>x.id===selectedId)?selectedId:'') || rows[0]?.id || '';
    setSelectedId(next);
    return next;
  }

  async function loadOperations(leadId:string){
    if(!leadId){setActivities([]);setTasks([]);return;}
    const h=await authHeaders(); if(!h){await router.replace('/login');return;}
    const r=await fetch(`/api/lead-operations?leadId=${encodeURIComponent(leadId)}`,{headers:h});
    const d=await r.json(); if(!r.ok)throw new Error(d.error||'Unable to load Lead operations');
    setActivities(d.activities||[]);setTasks(d.tasks||[]);setAgents(d.agents||[]);setRole(String(d.role||''));setActorAgentId(d.actorAgentId||null);
    setTaskAgent((current)=>current||d.lead?.assigned_agent_id||d.actorAgentId||'');
    setLastUpdated(new Date().toLocaleTimeString());
  }

  async function refresh(){
    setLoading(true);setError('');
    try{const id=await loadLeads();if(id)await loadOperations(id);}catch(e){setError((e as Error).message)}finally{setLoading(false)}
  }

  useEffect(()=>{if(router.isReady)refresh();},[router.isReady]);
  useEffect(()=>{if(selectedId&&router.isReady)loadOperations(selectedId).catch(e=>setError((e as Error).message));},[selectedId]);

  const selected=useMemo(()=>leads.find(x=>x.id===selectedId)||null,[leads,selectedId]);
  const assignedToActor=!!selected&&!!actorAgentId&&selected.assigned_agent_id===actorAgentId;
  const canOperate=!!selected&&(PRIVILEGED.has(role)||role==='operator'||(role==='agent'&&assignedToActor));
  const canAssignTask=PRIVILEGED.has(role)||role==='operator';
  const openTasks=tasks.filter(t=>!['completed','cancelled'].includes(t.status)).length;
  const overdue=tasks.filter(t=>!['completed','cancelled'].includes(t.status)&&t.due_at&&new Date(t.due_at).getTime()<Date.now()).length;

  async function mutate(body:Record<string,unknown>,success:string){
    if(!selected)return;
    setSaving(true);setError('');setNotice('');
    try{
      const h=await authHeaders();if(!h){await router.replace('/login');return;}
      const r=await fetch('/api/lead-operations',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify({leadId:selected.id,...body})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to complete operation');
      setNotice(success);await loadOperations(selected.id);
    }catch(e){setError((e as Error).message)}finally{setSaving(false)}
  }

  async function recordActivity(){
    if(!activitySubject.trim()){setError('Activity subject is required.');return;}
    await mutate({operation:'record_activity',activityType:activityType.trim()||'note',direction:activityDirection,subject:activitySubject.trim(),body:activityBody.trim()||null,outcome:activityOutcome.trim()||null},'Activity recorded with canonical Audit evidence.');
    setActivitySubject('');setActivityBody('');setActivityOutcome('');
  }

  async function createTask(){
    if(!taskTitle.trim()){setError('Task title is required.');return;}
    await mutate({operation:'create_task',title:taskTitle.trim(),description:taskDescription.trim()||null,taskType:taskType.trim()||'follow_up',dueAt:taskDue?new Date(taskDue).toISOString():null,priority:taskPriority,assignedAgentId:taskAgent||null},'Task created with Activity and Audit evidence.');
    setTaskTitle('');setTaskDescription('');setTaskDue('');setTaskPriority('normal');
  }

  async function updateTask(task:Task,changes:Record<string,unknown>){
    await mutate({operation:'update_task',taskId:task.id,...changes},'Task updated with Activity and Audit evidence.');
  }

  return <><Header/><main className="page"><div className="shell">
    <div className="heading"><div><p className="eyebrow">AI4 CONTACT CENTER · CR-01B PACKAGE 02</p><h1>Lead Activity + Task Operations</h1><p>Manual-refresh operational workspace for canonical Lead history and follow-up work. No polling, duplicate CRM, or alternate task authority.{lastUpdated?` · Last refreshed ${lastUpdated}`:''}</p></div><div className="headingActions"><span className="roleBadge">{role?role.toUpperCase():'ROLE PENDING'}</span><button onClick={refresh} disabled={loading}>{loading?'Refreshing…':'Refresh'}</button></div></div>

    <div className="metrics"><div className="metric"><small>Lead Activities</small><b>{activities.length}</b></div><div className="metric"><small>Open Tasks</small><b>{openTasks}</b></div><div className="metric"><small>Overdue</small><b>{overdue}</b></div><div className="metric"><small>Total Tasks</small><b>{tasks.length}</b></div></div>
    {error&&<div className="error">{error}</div>}{notice&&<div className="notice">{notice}</div>}

    <div className="workspace"><aside><div className="railTitle">Leads · {leads.length}</div>{leads.map(l=><button key={l.id} className={l.id===selectedId?'selected':''} onClick={()=>setSelectedId(l.id)}><strong>{l.contact?.display_name||l.contact?.company_name||l.title}</strong><span>{l.pipeline_stage.replace('_',' ')}</span><small>{l.title}</small></button>)}</aside>
      <section className="detail">{!selected?<div className="empty">Select a Lead.</div>:<>
        <div className="leadHead"><div><small>CANONICAL LEAD</small><h2>{selected.contact?.display_name||selected.contact?.company_name||selected.title}</h2><p>{selected.title} · {selected.pipeline_stage.replace('_',' ')} · {selected.status}</p></div><button onClick={()=>router.push(`/lead-management?leadId=${selected.id}`)}>Lead Lifecycle</button></div>
        {!canOperate&&<div className="permission">This Lead is read-only for your current role or Agent assignment.</div>}

        <div className="columns"><div className="panel"><div className="panelHead"><div><h3>Record Activity</h3><p>Add a business event to the immutable-style Lead history.</p></div></div>
          <div className="formGrid"><label><span>Type</span><input value={activityType} onChange={e=>setActivityType(e.target.value)} disabled={!canOperate||saving}/></label><label><span>Direction</span><select value={activityDirection} onChange={e=>setActivityDirection(e.target.value)} disabled={!canOperate||saving}><option>internal</option><option>inbound</option><option>outbound</option></select></label><label className="wide"><span>Subject</span><input value={activitySubject} onChange={e=>setActivitySubject(e.target.value)} disabled={!canOperate||saving}/></label><label className="wide"><span>Notes</span><textarea value={activityBody} onChange={e=>setActivityBody(e.target.value)} disabled={!canOperate||saving}/></label><label className="wide"><span>Outcome</span><input value={activityOutcome} onChange={e=>setActivityOutcome(e.target.value)} disabled={!canOperate||saving}/></label></div><button className="primary" onClick={recordActivity} disabled={!canOperate||saving||!activitySubject.trim()}>Record Activity</button>
        </div>

        <div className="panel"><div className="panelHead"><div><h3>Create Task</h3><p>Schedule tenant-scoped follow-up work against this Lead.</p></div></div><div className="formGrid"><label className="wide"><span>Title</span><input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} disabled={!canOperate||saving}/></label><label className="wide"><span>Description</span><textarea value={taskDescription} onChange={e=>setTaskDescription(e.target.value)} disabled={!canOperate||saving}/></label><label><span>Type</span><input value={taskType} onChange={e=>setTaskType(e.target.value)} disabled={!canOperate||saving}/></label><label><span>Priority</span><select value={taskPriority} onChange={e=>setTaskPriority(e.target.value)} disabled={!canOperate||saving}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></label><label><span>Due</span><input type="datetime-local" value={taskDue} onChange={e=>setTaskDue(e.target.value)} disabled={!canOperate||saving}/></label><label><span>Assigned Agent</span><select value={taskAgent} onChange={e=>setTaskAgent(e.target.value)} disabled={!canOperate||!canAssignTask||saving}><option value="">Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name} · {a.status}</option>)}</select></label></div><button className="primary" onClick={createTask} disabled={!canOperate||saving||!taskTitle.trim()}>Create Task</button></div></div>

        <div className="columns lower"><div className="panel"><div className="panelHead"><div><h3>Activity Timeline</h3><p>Newest canonical Lead event first.</p></div></div><div className="timeline">{activities.length===0?<div className="empty">No activities recorded.</div>:activities.map(a=><article key={a.id}><div><strong>{a.subject||a.activity_type.replaceAll('_',' ')}</strong><span>{new Date(a.created_at).toLocaleString()}</span></div><small>{a.activity_type.replaceAll('_',' ')} · {(a.direction||'internal').toUpperCase()} · {a.actor_agent?.name||'SYSTEM/USER'}</small>{a.body&&<p>{a.body}</p>}{a.outcome&&<em>Outcome: {a.outcome}</em>}</article>)}</div></div>

        <div className="panel"><div className="panelHead"><div><h3>Lead Tasks</h3><p>Explicit task states with completion/cancellation evidence.</p></div></div><div className="tasks">{tasks.length===0?<div className="empty">No tasks created.</div>:tasks.map(t=><article key={t.id} className={t.status}><div className="taskTop"><div><strong>{t.title}</strong><small>{t.task_type.replaceAll('_',' ')} · {t.priority.toUpperCase()}</small></div><span>{t.status.replace('_',' ')}</span></div>{t.description&&<p>{t.description}</p>}<div className="taskMeta"><span>Due: {t.due_at?new Date(t.due_at).toLocaleString():'—'}</span><span>Agent: {t.assigned_agent?.name||'Unassigned'}</span></div><div className="taskActions"><select value={t.status} onChange={e=>updateTask(t,{status:e.target.value})} disabled={!canOperate||saving}>{TASK_STATUSES.map(s=><option key={s}>{s}</option>)}</select><input type="datetime-local" value={localDateTime(t.due_at)} onChange={e=>updateTask(t,{dueAt:e.target.value?new Date(e.target.value).toISOString():null})} disabled={!canOperate||saving}/>{canAssignTask&&<select value={t.assigned_agent_id||''} onChange={e=>updateTask(t,{assignedAgentId:e.target.value||null})} disabled={!canOperate||saving}><option value="">Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}</div></article>)}</div></div></div>
      </>}</section></div>
  </div></main><Footer/><style jsx>{`
    .page{min-height:100vh;background:#06172d;color:#eef3ff;padding:30px 18px 70px}.shell{max-width:1450px;margin:0 auto}.heading{display:flex;justify-content:space-between;gap:22px;align-items:flex-end;margin-bottom:20px}.eyebrow,.railTitle,small{letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.58);font-size:12px}.heading h1,.leadHead h2{font-family:Georgia,serif;font-weight:400;margin:4px 0 8px}.heading h1{font-size:42px}.heading p,.leadHead p,.panelHead p{color:rgba(255,255,255,.64);margin:0;line-height:1.5}.headingActions{display:flex;align-items:center;gap:10px}.roleBadge{border:1px solid rgba(213,174,85,.45);padding:10px 12px;border-radius:999px;color:#e8cb87}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}.metric,.panel,aside,.detail{border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.045);border-radius:18px}.metric{padding:16px}.metric b{display:block;font-size:26px;margin-top:8px;color:#63d8ff}.workspace{display:grid;grid-template-columns:300px 1fr;gap:16px}.workspace aside{padding:12px;align-self:start;position:sticky;top:20px}.railTitle{padding:8px}.workspace aside button{width:100%;text-align:left;border:1px solid transparent;background:transparent;color:#eef3ff;border-radius:12px;padding:12px;margin:4px 0;display:grid;gap:6px}.workspace aside button span{color:#63d8ff;text-transform:uppercase;font-size:11px}.workspace aside button small{overflow:hidden;text-overflow:ellipsis}.workspace aside button.selected{border-color:rgba(99,216,255,.45);background:rgba(99,216,255,.08)}.detail{padding:18px}.leadHead,.panelHead,.taskTop,.taskMeta,.taskActions{display:flex;justify-content:space-between;gap:12px;align-items:center}.columns{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.lower{align-items:start}.panel{padding:16px}.panel h3{font-family:Georgia,serif;font-weight:400;font-size:23px;margin:0 0 5px}.formGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.formGrid label{display:grid;gap:6px}.formGrid label span{font-size:12px;color:rgba(255,255,255,.68);text-transform:uppercase;letter-spacing:.08em}.wide{grid-column:1/-1}input,select,textarea,button{font:inherit}input,select,textarea{width:100%;box-sizing:border-box;background:#071a3c;color:#eef3ff;border:1px solid rgba(255,255,255,.16);border-radius:9px;padding:10px}textarea{min-height:74px;resize:vertical}button{background:#0f2a6a;color:#eef3ff;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px 14px;cursor:pointer}.primary{background:#d5ae55;color:#071a3c;font-weight:700}.timeline,.tasks{display:grid;gap:10px;margin-top:12px}.timeline article,.tasks article{border-top:1px solid rgba(255,255,255,.1);padding:12px 0}.timeline article>div:first-child{display:flex;justify-content:space-between;gap:10px}.timeline p,.tasks p{color:rgba(255,255,255,.76);line-height:1.45}.timeline em{color:#e8cb87;font-style:normal}.taskTop>span{border:1px solid rgba(99,216,255,.3);padding:5px 8px;border-radius:999px;text-transform:uppercase;font-size:10px}.taskMeta{color:rgba(255,255,255,.58);font-size:12px;margin:9px 0}.taskActions{align-items:stretch}.taskActions>*{flex:1}.error,.notice,.permission{padding:12px 14px;border-radius:10px;margin:10px 0}.error{background:rgba(255,119,119,.1);border:1px solid rgba(255,119,119,.4)}.notice{background:rgba(62,227,145,.08);border:1px solid rgba(62,227,145,.35)}.permission{background:rgba(213,174,85,.08);border:1px solid rgba(213,174,85,.32)}.empty{color:rgba(255,255,255,.55);padding:18px 0}
    @media(max-width:1050px){.workspace{grid-template-columns:1fr}.workspace aside{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.railTitle{grid-column:1/-1}.columns{grid-template-columns:1fr}.heading{align-items:flex-start}.metrics{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:650px){.heading{display:grid}.heading h1{font-size:34px}.workspace aside{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}.formGrid{grid-template-columns:1fr}.wide{grid-column:auto}.leadHead,.panelHead,.taskTop,.taskMeta,.taskActions{align-items:flex-start;flex-direction:column}.taskActions>*{width:100%}}
  `}</style></>;
}
