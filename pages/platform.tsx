import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const groups=[
 {title:'Customer Engagement',copy:'Keep every sales opportunity moving across the channels customers use.',items:['Voice','SMS','Web Chat','Auto-Attendant','IVR Builder','Voice Attendant','Multi-Language Support']},
 {title:'Sales & Customer Management',copy:'Turn conversations into qualified, actionable sales records.',items:['Intelligent Sales Representative','Lead Management','Customer 360','Voicemail Management','Real-Time Agent Assist','Industry Templates']},
 {title:'Flow & Automation',copy:'Build repeatable sales processes without fragmenting the customer journey.',items:['Flow Designer','Flow Simulator','Flow Auto-Repair','Flow Versioning','Diff & Rollback','Deployment Manager','Flow Rewrite Engine']},
 {title:'Routing & Operations',copy:'Coordinate demand, capacity and the next best destination for each interaction.',items:['Routing Optimizer','Workforce Forecasting','Agent Skill Management','Enterprise Orchestration','Environment Management']},
 {title:'Analytics & Intelligence',copy:'Understand conversations, journeys, performance and the economics of the operation.',items:['Voice Analytics','Unified Analytics','Conversation Intelligence','Customer Journey Analytics','Agent Coaching','ROI & Cost Optimization']},
 {title:'Quality, Compliance & Governance',copy:'Operate with controls designed for quality, policy and accountable production changes.',items:['QA Auto-Scoring','Compliance Automation','Policy Enforcement','Security & Governance','Runtime Monitoring','Incident Management']},
 {title:'Knowledge & Intelligence',copy:'Give the sales operation governed knowledge, intent structure and playbooks.',items:['Knowledge Vault','Prompt Manager','Intent Taxonomy','Playbook Recommendations']}
];

export default function PlatformPage(){
 return <>
 
 <Header publicProductName="Sales Service System"/>
 <main className="platform">
  <section className="hero"><small>ONE COMPLETE SALES PLATFORM</small><h1>The capabilities behind an always-open sales operation.</h1><p>StellarUC brings customer engagement, sales management, automation, routing, intelligence, governance and knowledge into one operating environment—without feature-tier fragmentation.</p><div className="actions"><Link href="/demo">EXPERIENCE THE DEMO →</Link><Link href="/intake">REQUEST A PERSONAL CONSULTATION →</Link></div></section>
  <section className="grid">{groups.map(g=><article key={g.title}><span>STELLARUC</span><h2>{g.title}</h2><p>{g.copy}</p><ul>{g.items.map(i=><li key={i}>{i}</li>)}</ul></article>)}</section>
  <section className="close"><small>BUILT AROUND SALES</small><h2>Your business may close. Your sales operation doesn’t have to.</h2><p>StellarUC is designed to keep sales opportunities engaged around the clock, including periods of overflow, after-hours demand and simultaneous inbound conversations.</p><Link href="/demo">EXPERIENCE THE DEMO — TALK TO STELLARUC →</Link></section>
 </main><Footer/>
 <style jsx>{`
 .platform{background:#050505;color:#f7f7f4;min-height:100vh;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.hero,.grid,.close{max-width:1180px;margin:auto;padding:76px 28px}.hero{border-bottom:1px solid rgba(200,169,107,.2)}small,article span{color:#c8a96b;font-weight:900;letter-spacing:.13em;font-size:.72rem}.hero h1,.close h2,article h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500}.hero h1{font-size:clamp(2.8rem,6vw,5.4rem);line-height:.98;max-width:1000px;margin:.7rem 0 1.4rem}.hero p,.close p,article p{color:#b7b7b2;line-height:1.75}.hero p{font-size:1.1rem;max-width:820px}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.actions :global(a),.close :global(a){border:1px solid rgba(200,169,107,.55);padding:14px 18px;color:#e2cea2;text-decoration:none;font-weight:900;font-size:.78rem;letter-spacing:.05em}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding-top:50px}.grid article{border:1px solid rgba(200,169,107,.22);background:#0b0b0b;padding:30px}.grid article:last-child{grid-column:1/-1}.grid h2{font-size:2rem;margin:.55rem 0}.grid ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 24px;padding:0;margin:22px 0 0;list-style:none}.grid li{border-top:1px solid rgba(255,255,255,.09);padding-top:9px;color:#e8e8e3;font-size:.92rem}.close{border-top:1px solid rgba(200,169,107,.2);padding-bottom:100px}.close h2{font-size:clamp(2.3rem,5vw,4rem);max-width:900px;margin:.6rem 0 1rem}.close p{max-width:760px;margin-bottom:30px}
 @media(max-width:720px){.hero,.grid,.close{padding-left:20px;padding-right:20px}.grid{grid-template-columns:1fr}.grid article:last-child{grid-column:auto}.grid ul{grid-template-columns:1fr}.hero{padding-top:50px}}
 `}</style>
 </>;
}
