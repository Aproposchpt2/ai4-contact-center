'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgentSkillMatrixDashboard from '@/components/AgentSkillMatrixDashboard';

const SAMPLE = JSON.stringify({
  agents: [
    { agentId: 'a1', agentName: 'Maya', skills: [{ skill: 'Billing', proficiency: 4 }, { skill: 'Retention', proficiency: 3 }], channels: ['voice', 'chat'] },
    { agentId: 'a2', agentName: 'Jordan', skills: [{ skill: 'Tech Support', proficiency: 5 }], channels: ['chat', 'email'] },
  ],
  mappings: [
    { skill: 'Billing', intents: ['billing_dispute'], channels: ['voice', 'chat'], queues: ['queue-billing'], flows: ['flow-billing'] },
    { skill: 'Tech Support', intents: ['technical_issue'], channels: ['chat', 'email'], queues: ['queue-tech'], flows: ['flow-tech'] },
  ],
  demand: [
    { intent: 'billing_dispute', requiredSkill: 'Billing', requiredAgents: 3 },
    { intent: 'technical_issue', requiredSkill: 'Tech Support', requiredAgents: 2 },
  ],
}, null, 2);

export default function AgentSkillMatrixPage() {
  const [input, setInput] = useState(SAMPLE);
  const [analysis, setAnalysis] = useState<{
    agents: Array<{ agentId: string; agentName: string; skills: Array<{ skill: string; proficiency: number }>; channels: string[] }>;
    skills: string[];
    mappings: Array<{ skill: string; intents: string[]; channels: string[]; queues: string[]; flows: string[] }>;
    gaps: Array<{ intent: string; requiredSkill: string; requiredAgents: number; coveredAgents: number; gap: number }>;
    recommendations: string[];
    summary: { totalAgents: number; totalSkills: number; underCoveredIntents: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    try {
      const payload = JSON.parse(input);
      const response = await fetch('/api/skills/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Skill analysis failed');
      setAnalysis(data);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skill-matrix.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>AI4 Contact Center · System #31</p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>Agent Skill Matrix & Capability Modeling</h1>
          <AgentSkillMatrixDashboard input={input} onInputChange={setInput} analysis={analysis} busy={busy} error={error} onRun={run} onDownload={download} />
        </div>
      </main>
      <Footer />
    </>
  );
}

