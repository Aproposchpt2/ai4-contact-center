'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Agent={id:string;name:string;email:string|null;status:string};
type Lead={
  id:string;title:string;service_interest:string|null;description:string|null;pipeline_stage:string;status:string;
  priority:string;score:number;estimated_value:number;probability:number;expected_close_date:string|null;
  next_action:string|null;next_follow_up:string|null;lost_reason:string|null;converted_at:string|null;
  assigned_agent_id:string|null;originating_agent_id:string|null;originating_interaction_id:string|null;originating_channel:string|null;updated_at:string;
  contact?:{id?:string;display_name:string|null;first_name:string|null;last_name:string|null;company_name:string|null;email:string|null;phone:string|null}|null;
  assigned_agent?:Agent|null;originating_queue?:{id?:string;name:string;code?:string}|null;originating_agent?:Agent|null;
};
type LeadForm={assignedAgentId:string;pipelineStage:string;priority:string;score:string;estimatedValue:string;probability:string;expectedCloseDate:string;nextAction:string;nextFollowUp:string;lostReason:string};

const NON_TERMINAL_STAGES=['new','qualified','contacted','follow_up','opportunity','nurture'];
const AGENT_STAGES=['new','qualified','contacted','follow_up','opportunity'];
const ALL_STAGES=[...NON_TERMINAL_STAGES,'converted','lost'];
const PRIORITIES=['low','normal','high','urgent'];
const PRIVILEGED_ROLES=new Set(['owner','admin','supervisor']);
const TERMINAL_STAGES=new Set(['converted','lost']);

function dateTimeLocal(value:string|null){
  if(!value)return '';
  const date=new Date(value);if(Number.isNaN(date.getTime()))return '';
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}
function makeForm(lead:Lead):LeadForm{return{
  assignedAgentId:lead.assigned_agent_id||'',pipelineStage:lead.pipeline_stage,priority:lead.priority||'normal',score:String(lead.score??0),
  estimatedValue:String(Number(lead.estimated_value||0)),probability:String(lead.probability??0),expectedCloseDate:lead.expected_close_date||'',
  nextAction:lead.next_action||'',nextFollowUp:dateTimeLocal(lead.next_follow_up),lostReason:lead.lost_reason||''
};}
function displayName(lead:Lead){return lead.contact?.display_name||lead.contact?.company_name||lead.title;}

export default function LeadManagementPage(){
  const router=useRouter();
  const [leads,setLeads]=useState<Lead[]>([]);const [agents,setAgents]=useState<Agent[]>([]);const [role,setRole]=useState('');const [actorAgentId,setActorAgentId]=useState<string|null>(null);
  const [selectedId,setSelectedId]=useState('');const [form,setForm]=useState<LeadForm|null>(null);const [loading,setLoading]=useState(false);const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [interactionId,setInteractionId]=useState('');const [lastUpdated,setLastUpdated]=useState('');
  const [search,setSearch]=useState('');const [stageFilter,setStageFilter]=useState('all');const [priorityFilter,setPriorityFilter]=useState('all');const [ownershipFilter,setOwnershipFilter]=useState('all');

  async function headers(){if(!supabase)return null;const {data:{session}}=await supabase.auth.getSession();return session?{Authorization:`Bearer ${session.access_token}`} : null;}
  async function refresh(preferredId?:string){
    setLoading(true);setError('');
    try{
      if(!isSupabaseConfigured()||!supabase)throw new Error('Canonical Supabase configuration is required.');
      const h=await headers();if(!h){await router.replace('/login');return;}
      const r=await fetch('/api/lead-management',{headers:h});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load Leads');
      const rows:Lead[]=d.leads||[];setLeads(rows);setAgents(d.agents||[]);setRole(String(d.role||''));setActorAgentId(d.actorAgentId||null);
      const queryLead=typeof router.query.leadId==='string'?router.query.leadId:'';
      const wanted=preferredId||queryLead||selectedId;const next=wanted&&rows.some(x=>x.id===wanted)?wanted:(rows[0]?.id||'');setSelectedId(next);
      setLastUpdated(new Date().toLocaleTimeString());
    }catch(e){setError((e as Error).message)}finally{setLoading(false)}
  }
  useEffect(()=>{if(router.isReady)refresh();},[router.isReady]);
  const selected=useMemo(()=>leads.find(x=>x.id===selectedId)||null,[leads,selectedId]);
  useEffect(()=>{if(selected)setForm(makeForm(selected));else setForm(null);},[selected?.id,selected?.updated_at]);

  const filteredLeads=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return leads.filter(l=>{
      if(stageFilter!=='all'&&l.pipeline_stage!==stageFilter)return false;
      if(priorityFilter!=='all'&&l.priority!==priorityFilter)return false;
      if(ownershipFilter==='mine'&&(!actorAgentId||l.assigned_agent_id!==actorAgentId))return false;
      if(ownershipFilter==='unassigned'&&l.assigned_agent_id)return false;
      if(!q)return true;
      return [l.title,l.service_interest,l.pipeline_stage,l.priority,l.status,l.contact?.display_name,l.contact?.company_name,l.contact?.email,l.contact?.phone,l.assigned_agent?.name,l.next_action].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  },[leads,search,stageFilter,priorityFilter,ownershipFilter,actorAgentId]);
  const metrics=useMemo(()=>({total:leads.length,open:leads.filter(x=>!TERMINAL_STAGES.has(x.pipeline_stage)).length,opps:leads.filter(x=>x.pipeline_stage==='opportunity').length,follow:leads.filter(x=>x.pipeline_stage==='follow_up').length,won:leads.filter(x=>x.pipeline_stage==='converted').length,value:leads.filter(x=>x.pipeline_stage!=='lost').reduce((a,x)=>a+Number(x.estimated_value||0),0)}),[leads]);

  const privileged=PRIVILEGED_ROLES.has(role);const selectedTerminal=!!selected&&TERMINAL_STAGES.has(selected.pipeline_stage);const assignedToActor=!!selected&&!!actorAgentId&&selected.assigned_agent_id===actorAgentId;
  const canEdit=!!selected&&(privileged||(role==='operator'&&!selectedTerminal)||(role==='agent'&&assignedToActor&&AGENT_STAGES.includes(selected.pipeline_stage)));
  const canAssign=!!selected&&privileged;const canCommercial=canEdit&&role!=='agent';const canTerminal=!!selected&&privileged;const stageOptions=role==='agent'?AGENT_STAGES:NON_TERMINAL_STAGES;
  function selectLead(id:string){setSelectedId(id);router.replace({pathname:'/lead-management',query:{leadId:id}},undefined,{shallow:true}).catch(()=>undefined);}
  function setField<K extends keyof LeadForm>(key:K,value:LeadForm[K]){setForm(current=>current?{...current,[key]:value}:current);}

  async function createFromInteraction(){
    const id=interactionId.trim();if(!id)return;setSaving(true);setError('');setNotice('');
    try{const h=await headers();if(!h){await router.replace('/login');return;}const r=await fetch('/api/lead-management',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify({interactionId:id})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to create Lead');setInteractionId('');setNotice('Lead created from the canonical interaction.');await refresh(d.lead.id);selectLead(d.lead.id);}catch(e){setError((e as Error).message)}finally{setSaving(false)}
  }
  function buildOperationalPatch(){
    if(!selected||!form)return null;const patch:Record<string,unknown>={leadId:selected.id};
    if(form.pipelineStage!==selected.pipeline_stage)patch.pipelineStage=form.pipelineStage;if(form.priority!==selected.priority)patch.priority=form.priority;if(Number(form.score)!==Number(selected.score))patch.score=Number(form.score);
    if(role!=='agent'){if(Number(form.estimatedValue)!==Number(selected.estimated_value||0))patch.estimatedValue=Number(form.estimatedValue);if(Number(form.probability)!==Number(selected.probability||0))patch.probability=Number(form.probability);if(form.expectedCloseDate!==(selected.expected_close_date||''))patch.expectedCloseDate=form.expectedCloseDate||null;}
    if(privileged&&form.assignedAgentId!==selected.assigned_agent_id)patch.assignedAgentId=form.assignedAgentId||null;
    if(form.nextAction.trim()!==(selected.next_action||''))patch.nextAction=form.nextAction.trim()||null;
    if(form.nextFollowUp!==dateTimeLocal(selected.next_follow_up))patch.nextFollowUp=form.nextFollowUp?new Date(form.nextFollowUp).toISOString():null;
    return Object.keys(patch).length>1?patch:null;
  }
  async function mutate(payload:Record<string,unknown>,success:string){
    if(!selected)return;setSaving(true);setError('');setNotice('');
    try{const h=await headers();if(!h){await router.replace('/login');return;}const r=await fetch('/api/lead-management',{method:'PATCH',headers:{'Content-Type':'application/json',...h},body:JSON.stringify({leadId:selected.id,...payload})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to update Lead');setNotice(success);await refresh(selected.id);}catch(e){setError((e as Error).message)}finally{setSaving(false)}
  }
  async function saveOperational(){if(!canEdit){setError('Your role is not authorized to edit this Lead.');return;}const patch=buildOperationalPatch();if(!patch){setNotice('No material changes to save.');return;}const {leadId:_leadId,...changes}=patch;await mutate(changes,'Lead changes committed with business Activity and Audit evidence.');}
  async function convertLead(){if(!selected||!canTerminal)return;if(!window.confirm(`Convert “${selected.title}” to WON? This is a terminal lifecycle action.`))return;await mutate({pipelineStage:'converted'},'Lead converted to WON.');}
  async function markLost(){if(!selected||!form||!canTerminal)return;const reason=form.lostReason.trim();if(!reason){setError('A meaningful lost reason is required.');return;}if(!window.confirm(`Mark “${selected.title}” LOST with the recorded reason? This is a terminal lifecycle action.`))return;await mutate({pipelineStage:'lost',lostReason:reason},'Lead marked LOST with disposition evidence.');}

  return <><Header/><main className="page"><div className="shell">
    <div className="heading"><div><p className="eyebrow">AI4 CONTACT CENTER · OPERATOR CRM</p><h1>Lead Management</h1><p>Primary operator workspace for canonical Lead lifecycle, follow-up, Activity and Task operations. Manual refresh only.{lastUpdated?` · Last refreshed ${lastUpdated}`:''}</p></div><div className="headingActions"><span className="roleBadge">{role?role.toUpperCase():'ROLE PENDING'}</span><button onClick={()=>refresh(selected?.id)} disabled={loading}>{loading?'Refreshing…':'Refresh Leads'}</button></div></div>
    <div className="metrics">{[['Total Leads',metrics.total],['Open',metrics.open],['Opportunities',metrics.opps],['Follow-Up',metrics.follow],['Converted',metrics.won],['Pipeline Value',`$${metrics.value.toLocaleString()}`]].map(([k,v])=><div className="metric" key={String(k)}><small>{k}</small><b>{v}</b></div>)}</div>
    <div className="create"><div><strong>Create from canonical interaction</strong><span>CR-01A creation remains unchanged.</span></div><input value={interactionId} onChange={e=>setInteractionId(e.target.value)} placeholder="Interaction UUID"/><button onClick={createFromInteraction} disabled={saving||!interactionId.trim()}>Create Lead</button></div>
    <div className="filters"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, company, email, phone, Lead, action…"/><select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="all">All stages</option>{ALL_STAGES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select><select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option value="all">All priorities</option>{PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}</select><select value={ownershipFilter} onChange={e=>setOwnershipFilter(e.target.value)}><option value="all">All ownership</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option></select><span>{filteredLeads.length} shown</span></div>
    {error&&<div className="error">{error}</div>}{notice&&<div className="notice">{notice}</div>}
    <div className="workspace"><aside><div className="railTitle">Pipeline · {filteredLeads.length}</div>{filteredLeads.length===0?<p className="empty">No Leads match the current filters.</p>:filteredLeads.map(l=><button className={l.id===selectedId?'selected':''} key={l.id} onClick={()=>selectLead(l.id)}><div className="row"><strong>{displayName(l)}</strong><span>{l.pipeline_stage.replace('_',' ')}</span></div><p>{l.title}</p><small>{l.priority.toUpperCase()} · {l.assigned_agent?.name||'UNASSIGNED'} · {l.next_follow_up?new Date(l.next_follow_up).toLocaleDateString():'NO FOLLOW-UP'}</small></button>)}</aside>
      <section className="detail">{!selected||!form?<div className="empty">Select or create a Lead.</div>:<>
        <div className="hero"><div><small>{selected.originating_channel?.toUpperCase()||'LEAD'} CUSTOMER INTELLIGENCE</small><h2>{displayName(selected)}</h2><p>{selected.contact?.company_name||selected.contact?.email||selected.contact?.phone||selected.title}</p></div><div className="heroActions"><div className="heroBadges"><span className="stage">{selected.pipeline_stage.replace('_',' ')}</span><span className={`status ${selected.status}`}>{selected.status}</span></div><button className="secondary" onClick={()=>router.push(`/lead-operations?leadId=${selected.id}`)}>Activity + Tasks</button></div></div>
        <div className="actionStrip"><div><small>Priority</small><b>{selected.priority}</b></div><div><small>Assigned Agent</small><b>{selected.assigned_agent?.name||'Unassigned'}</b></div><div><small>Next Action</small><b>{selected.next_action||'Not recorded'}</b></div><div><small>Next Follow-Up</small><b>{selected.next_follow_up?new Date(selected.next_follow_up).toLocaleString():'Not scheduled'}</b></div><div><small>Value / Probability</small><b>${Number(selected.estimated_value||0).toLocaleString()} · {selected.probability}%</b></div></div>
        {!canEdit&&<div className="permission">This Lead is read-only for your current <b>{role||'unknown'}</b> role or assignment state.</div>}
        <div className="panel"><div className="panelHead"><div><h3>Operational Lifecycle</h3><p>Lifecycle and commercial changes continue through the Package 01 transactional authority.</p></div><div className="panelActions"><button className="secondary" onClick={()=>router.push(`/lead-operations?leadId=${selected.id}`)}>Open Activity + Tasks</button><button className="primary" onClick={saveOperational} disabled={saving||!canEdit}>{saving?'Saving…':'Save Changes'}</button></div></div>
          <div className="formGrid"><label><span>Assigned Agent</span><select value={form.assignedAgentId} onChange={e=>setField('assignedAgentId',e.target.value)} disabled={!canAssign||saving}><option value="">Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name} · {a.status}</option>)}</select></label><label><span>{selectedTerminal&&privileged?'Terminal Stage / Reopen':'Pipeline Stage'}</span><select value={form.pipelineStage} onChange={e=>setField('pipelineStage',e.target.value)} disabled={!canEdit||saving}>{selectedTerminal&&<option value={selected.pipeline_stage} disabled>{selected.pipeline_stage.replace('_',' ')} · terminal</option>}{stageOptions.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></label><label><span>Priority</span><select value={form.priority} onChange={e=>setField('priority',e.target.value)} disabled={!canEdit||saving}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></label><label><span>Lead Score</span><input type="number" min="0" max="100" value={form.score} onChange={e=>setField('score',e.target.value)} disabled={!canEdit||saving}/></label><label><span>Estimated Value</span><input type="number" min="0" step="0.01" value={form.estimatedValue} onChange={e=>setField('estimatedValue',e.target.value)} disabled={!canCommercial||saving}/></label><label><span>Probability %</span><input type="number" min="0" max="100" value={form.probability} onChange={e=>setField('probability',e.target.value)} disabled={!canCommercial||saving}/></label><label><span>Expected Close Date</span><input type="date" value={form.expectedCloseDate} onChange={e=>setField('expectedCloseDate',e.target.value)} disabled={!canCommercial||saving}/></label><label className="wide"><span>Next Action</span><textarea rows={3} value={form.nextAction} onChange={e=>setField('nextAction',e.target.value)} disabled={!canEdit||saving}/></label><label><span>Next Follow-Up</span><input type="datetime-local" value={form.nextFollowUp} onChange={e=>setField('nextFollowUp',e.target.value)} disabled={!canEdit||saving}/></label></div>
        </div>
        <div className="panel"><h3>Canonical Lead Context</h3><div className="grid">{[['Lead Title',selected.title],['Service Interest',selected.service_interest||'—'],['Status',selected.status],['Origin Channel',selected.originating_channel?.toUpperCase()||'—'],['Origin Queue',selected.originating_queue?.name||'—'],['Origin Agent',selected.originating_agent?.name||'—'],['Email',selected.contact?.email||'—'],['Phone',selected.contact?.phone||'—']].map(([k,v])=><div className="info" key={String(k)}><small>{k}</small><b>{v}</b></div>)}</div></div>
        <div className="panel terminal"><div><h3>Terminal Disposition</h3><p>WON / LOST remain deliberate privileged lifecycle actions.</p></div>{canTerminal?<div className="terminalGrid"><div><button className="convert" onClick={convertLead} disabled={saving||selected.pipeline_stage==='converted'}>Convert / Won</button></div><div><textarea value={form.lostReason} onChange={e=>setField('lostReason',e.target.value)} rows={2} placeholder="Required lost reason" disabled={saving}/><button className="lost" onClick={markLost} disabled={saving||!form.lostReason.trim()||selected.pipeline_stage==='lost'}>Mark Lost</button></div></div>:<div className="permission compact">Terminal disposition is not available to the {role||'current'} role.</div>}</div>
      </>}</section></div>
  </div></main><Footer/><style jsx>{`
    :global(*){box-sizing:border-box}:global(body){margin:0;background:#071A3C}.page{min-height:100vh;background:#071A3C;color:#EEF3FF;padding:2rem clamp(1rem,3vw,2rem);font-family:Arial,sans-serif}.shell{max-width:1380px;margin:auto}.heading{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;flex-wrap:wrap}.eyebrow{color:#D5AE55;font-size:.68rem;font-weight:800;letter-spacing:.16em}.heading h1,.hero h2{font-family:Georgia,serif;font-weight:400;margin:.2rem 0}.heading h1{font-size:clamp(2rem,4vw,3rem)}.heading p,.hero p,.panel p{color:rgba(255,255,255,.58);line-height:1.5}.headingActions,.panelActions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.roleBadge{border:1px solid rgba(91,211,255,.38);color:#8fe3ff;border-radius:999px;padding:7px 10px;font-size:.65rem;font-weight:800}.heading button,.create button,.primary,.secondary{border:0;border-radius:7px;padding:.75rem 1rem;font-weight:800;cursor:pointer}.heading button,.create button,.primary{background:#D5AE55;color:#071A3C}.secondary{background:#0F2A6A;color:#EEF3FF;border:1px solid rgba(255,255,255,.15)}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:22px 0}.metric,.create,.filters,aside,.detail,.panel,.actionStrip{border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.055);border-radius:10px}.metric{padding:14px}.metric small,.info small,.hero small,.actionStrip small{display:block;color:rgba(255,255,255,.58);font-size:.65rem;text-transform:uppercase;letter-spacing:.08em}.metric b{display:block;margin-top:7px;font-size:1.3rem}.create{padding:13px;display:grid;grid-template-columns:1fr minmax(260px,420px) auto;gap:12px;align-items:center}.create span{display:block;color:rgba(255,255,255,.58);font-size:.78rem;margin-top:4px}.filters{display:grid;grid-template-columns:minmax(260px,1fr) repeat(3,minmax(135px,190px)) auto;gap:10px;padding:12px;align-items:center;margin-top:12px}.filters span{color:#E8CB87;font-size:.75rem;font-weight:700;text-align:right}input,select,textarea{background:#0F2A6A;color:#EEF3FF;border:1px solid rgba(255,255,255,.15);border-radius:7px;padding:.78rem;width:100%;font:inherit}textarea{resize:vertical}button:disabled,input:disabled,select:disabled,textarea:disabled{opacity:.48;cursor:not-allowed}.error,.notice,.permission{margin:12px 0;padding:12px;border-radius:8px}.error{border:1px solid #FF7777;color:#FFB0B0}.notice{border:1px solid rgba(91,211,255,.45);color:#9ce8ff}.permission{border:1px solid rgba(213,174,85,.35);color:#E8CB87}.permission.compact{margin:0}.workspace{display:grid;grid-template-columns:330px 1fr;gap:14px;margin-top:14px}aside{align-self:start;position:sticky;top:74px;max-height:calc(100vh - 92px);overflow-y:auto}.railTitle{padding:12px;border-bottom:1px solid rgba(255,255,255,.13);font-size:.68rem;letter-spacing:.1em;color:rgba(255,255,255,.58)}aside button{width:100%;border:0;border-bottom:1px solid rgba(255,255,255,.08);background:transparent;color:#EEF3FF;text-align:left;padding:13px;cursor:pointer}aside button.selected{background:#0F2A6A}.row{display:flex;justify-content:space-between;gap:10px}.row span,.stage,.status{color:#E8CB87;text-transform:uppercase;font-size:.62rem;font-weight:800}.row+p{margin:6px 0;color:rgba(255,255,255,.72);font-size:.8rem}aside small{color:rgba(255,255,255,.45)}.detail{padding:16px;min-width:0}.hero{display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid rgba(255,255,255,.13);padding-bottom:14px}.heroActions{display:flex;flex-direction:column;align-items:flex-end;gap:10px}.heroBadges{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.stage,.status{border:1px solid rgba(213,174,85,.4);border-radius:999px;padding:7px 10px}.status{color:#8fe3ff;border-color:rgba(91,211,255,.35)}.actionStrip{display:grid;grid-template-columns:.7fr 1fr 1.6fr 1.4fr 1fr;gap:0;margin:14px 0}.actionStrip>div{padding:11px;border-right:1px solid rgba(255,255,255,.1);min-width:0}.actionStrip>div:last-child{border-right:0}.actionStrip b{display:block;margin-top:5px;font-size:.8rem;overflow-wrap:anywhere}.panel{padding:14px;margin-top:12px}.panel h3{margin:0 0 6px}.panelHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.formGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.formGrid label{display:flex;flex-direction:column;gap:6px}.formGrid label>span{font-size:.7rem;color:#E8CB87;text-transform:uppercase;font-weight:800}.formGrid .wide{grid-column:span 2}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:12px}.info{border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:11px;min-width:0}.info b{display:block;margin-top:5px;overflow-wrap:anywhere;font-size:.8rem}.terminal{border-color:rgba(213,174,85,.25)}.terminalGrid{display:grid;grid-template-columns:1fr 1.4fr;gap:14px;margin-top:12px}.terminalGrid>div{border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:12px}.terminalGrid button{border:0;border-radius:7px;padding:.75rem 1rem;font-weight:800;cursor:pointer}.convert{background:#56D67E;color:#082B15}.lost{background:#FF7777;color:#3B0707;margin-top:8px}.empty{padding:20px;color:rgba(255,255,255,.58)}
    @media(max-width:1150px){.metrics{grid-template-columns:repeat(3,1fr)}.filters{grid-template-columns:1fr 1fr 1fr}.filters input{grid-column:1/-1}.filters span{text-align:left}.workspace{grid-template-columns:285px 1fr}.actionStrip{grid-template-columns:repeat(2,1fr)}.actionStrip>div{border-bottom:1px solid rgba(255,255,255,.1)}.grid{grid-template-columns:repeat(2,1fr)}.formGrid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:820px){.workspace{grid-template-columns:1fr}aside{position:static;max-height:360px}.create{grid-template-columns:1fr}.filters{grid-template-columns:1fr 1fr}.filters input{grid-column:1/-1}.formGrid{grid-template-columns:1fr}.formGrid .wide{grid-column:auto}.terminalGrid{grid-template-columns:1fr}.hero{flex-direction:column}.heroActions{align-items:flex-start}.heroBadges{justify-content:flex-start}.actionStrip{grid-template-columns:1fr 1fr}}
    @media(max-width:600px){.metrics,.grid,.filters,.actionStrip{grid-template-columns:1fr}.headingActions,.panelActions{width:100%}.headingActions button,.panelActions button{flex:1}.panelHead{flex-direction:column}}
  `}</style></>;
}
