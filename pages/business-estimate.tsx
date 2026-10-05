import { trackPublicEvent } from '@/lib/publicAnalytics';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PLATFORM_FEE = 495;
const VOICE_RATE = 0.50;
function money(value:number){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value); }

export default function BusinessEstimatePage(){
  const [calls,setCalls]=useState(300);
  const [minutes,setMinutes]=useState(4);
  const [profit,setProfit]=useState(500);
  const [submitted,setSubmitted]=useState(true);
  const result=useMemo(()=>{
    const safeCalls=Math.max(0,Number(calls)||0);
    const safeMinutes=Math.max(0,Number(minutes)||0);
    const safeProfit=Math.max(0,Number(profit)||0);
    const voiceMinutes=safeCalls*safeMinutes;
    const voiceUsage=voiceMinutes*VOICE_RATE;
    const monthly=PLATFORM_FEE+voiceUsage;
    const jobs=safeProfit>0?Math.ceil(monthly/safeProfit):null;
    return {voiceMinutes,voiceUsage,monthly,jobs};
  },[calls,minutes,profit]);
  function calculate(e:FormEvent){e.preventDefault();setSubmitted(true);trackPublicEvent('estimate_calculated');}
  return <>
    
    <Header publicProductName="Sales Service System"/>
    <main className="estimatePage">
      <section className="estimateHero">
        <small>STELLARUC BUSINESS ESTIMATE</small>
        <h1>Calculate Your Business Estimate.</h1>
        <p>Use your own inbound-call activity and gross profit per completed job to see an estimated monthly StellarUC service cost and its break-even point.</p>
      </section>
      <section className="calculatorShell">
        <form onSubmit={calculate} className="estimateForm">
          <div><label htmlFor="calls">Average inbound calls per month</label><input id="calls" type="number" min="0" step="1" value={calls} onChange={e=>setCalls(Number(e.target.value))}/></div>
          <div><label htmlFor="minutes">Average call length (minutes)</label><input id="minutes" type="number" min="0" step=".1" value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></div>
          <div><label htmlFor="profit">Average gross profit per completed job</label><input id="profit" type="number" min="0" step="1" value={profit} onChange={e=>setProfit(Number(e.target.value))}/></div>
          <button type="submit">CALCULATE MY ESTIMATE</button>
        </form>
        {submitted && <div className="results" aria-live="polite">
          <small>YOUR BUSINESS ESTIMATE</small>
          <div className="resultRow"><span>Estimated monthly calls</span><strong>{Math.round(calls||0).toLocaleString()}</strong></div>
          <div className="resultRow"><span>Estimated completed voice minutes</span><strong>{Math.round(result.voiceMinutes).toLocaleString()}</strong></div>
          <div className="resultRow"><span>Platform access</span><strong>{money(PLATFORM_FEE)}</strong></div>
          <div className="resultRow"><span>Estimated voice usage</span><strong>{money(result.voiceUsage)}</strong></div>
          <div className="resultRow total"><span>Estimated monthly StellarUC service</span><strong>{money(result.monthly)}</strong></div>
          <div className="breakEven"><span>BREAK-EVEN ESTIMATE</span><b>{result.jobs===null?'Enter gross profit per job':result.jobs+' additional '+(result.jobs===1?'job':'jobs')}</b><p>{result.jobs!==null?'At '+money(profit)+' gross profit per additional completed job, approximately '+result.jobs+' additional '+(result.jobs===1?'job':'jobs')+' would cover this estimated monthly service cost.':'Gross profit per completed job must be greater than zero to calculate break-even.'}</p></div>
        </div>}
      </section>
      <section className="method">
        <small>TRANSPARENT BY DESIGN</small><h2>Know how the estimate is calculated.</h2>
        <p><strong>Only pay for your monthly usage.</strong> Your actual monthly bill reflects actual service usage. This calculator is an estimate based on the information you enter and does not guarantee additional jobs, revenue, savings, or business results.</p>
        <div className="actions"><Link href="/demo">EXPERIENCE THE DEMO — TALK TO STELLARUC →</Link><Link href="/#pricing">VIEW PRICING →</Link></div>
      </section>
    </main>
    <Footer/>
    <style jsx>{`
      .estimatePage{--gold:#C8A96B;--gold2:#E2CEA2;--text:#F7F7F4;--muted:#B7B7B2;min-height:100vh;background:#050505;color:var(--text);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .estimateHero,.calculatorShell,.method{max-width:1180px;margin:auto;padding:72px 28px}.estimateHero{padding-bottom:34px}.estimateHero small,.results small,.method small{color:var(--gold);font-weight:800;letter-spacing:.12em}.estimateHero h1,.method h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:clamp(2.6rem,6vw,5rem);line-height:1;margin:.65rem 0 1.2rem}.estimateHero p,.method p{max-width:800px;color:var(--muted);font-size:1.08rem;line-height:1.8}
      .calculatorShell{display:grid;grid-template-columns:.9fr 1.1fr;gap:32px;padding-top:24px}.estimateForm,.results{border:1px solid rgba(200,169,107,.26);background:#0d0d0d;padding:28px}.estimateForm div{margin-bottom:22px}.estimateForm label{display:block;margin-bottom:8px;font-size:.82rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.estimateForm input{width:100%;min-height:52px;background:#080808!important;border:1px solid rgba(255,255,255,.16)!important;color:white!important;padding:12px 14px;font-size:1.1rem}.estimateForm button{width:100%;min-height:52px;border:1px solid var(--gold);background:var(--gold);color:#080808;font-weight:900;letter-spacing:.06em;cursor:pointer}.resultRow{display:flex;justify-content:space-between;gap:20px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.1);color:var(--muted)}.resultRow strong{color:var(--text);font-size:1.1rem}.resultRow.total{margin-top:8px;padding:20px 0;color:var(--text)}.resultRow.total strong{color:var(--gold2);font-size:1.5rem}.breakEven{margin-top:24px;border-left:3px solid var(--gold);padding:8px 0 8px 20px}.breakEven span{display:block;color:var(--gold);font-size:.72rem;font-weight:900;letter-spacing:.1em}.breakEven b{display:block;font-family:"Cormorant Garamond",Georgia,serif;font-size:2.2rem;color:var(--gold2);margin:.35rem 0}.breakEven p{color:var(--muted);line-height:1.7;margin:0}.method{border-top:1px solid rgba(200,169,107,.2)}.method h2{font-size:clamp(2.2rem,4vw,3.5rem)}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.actions :global(a){border:1px solid rgba(200,169,107,.5);color:var(--gold2);padding:14px 18px;text-decoration:none;font-weight:800;font-size:.78rem;letter-spacing:.05em}
      @media(max-width:760px){.calculatorShell{grid-template-columns:1fr}.estimateHero,.calculatorShell,.method{padding-left:20px;padding-right:20px}.estimateHero{padding-top:48px}.resultRow{align-items:flex-start}.estimateForm,.results{padding:20px}}
    `}</style>
  </>;
}

