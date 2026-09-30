'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgentCoachingDashboard from '@/components/AgentCoachingDashboard';
import type { CoachingInputTranscript, CoachingOutput } from '@/lib/agentCoachingEngine';

const DEFAULT_TRANSCRIPT = `[09:00:00] Customer: I am still being routed in circles and my billing issue is unresolved.
[09:00:22] Agent: I am sorry this happened. I will review your account and make sure we resolve this.
[09:01:02] Customer: This is frustrating, I already called twice.
[09:01:30] Agent: I understand. I can transfer to billing and escalate to a supervisor if needed.`;

export default function AgentCoachingPage() {
  const [transcriptIds, setTranscriptIds] = useState('billing-101, tech-205');
  const [transcriptText, setTranscriptText] = useState(DEFAULT_TRANSCRIPT);
  const [team, setTeam] = useState('');
  const [queue, setQueue] = useState('');
  const [flowId, setFlowId] = useState('');
  const [output, setOutput] = useState<CoachingOutput | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildPayload() {
    const ids = transcriptIds
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const transcripts: CoachingInputTranscript[] = transcriptText.trim()
      ? [
          {
            id: 'manual-transcript',
            text: transcriptText,
            fileName: 'manual.txt',
            agentId: 'agent-manual',
            agentName: 'Agent Manual',
            team: team || 'General',
            queue: queue || 'General Queue',
            flowId: flowId || 'flow-main',
          },
        ]
      : [];
    return {
      transcriptIds: ids,
      transcripts,
      team: team || undefined,
      queue: queue || undefined,
      flowId: flowId || undefined,
    };
  }

  async function handleAnalyze() {
    setError(null);
    setIsRunning(true);
    try {
      const payload = buildPayload();
      const response = await fetch('/api/coaching/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Failed to run coaching analysis');
      setOutput(data as CoachingOutput);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleDownloadReport() {
    try {
      const payload = buildPayload();
      const response = await fetch('/api/coaching/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Failed to generate coaching report');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'coaching-report.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDownloadPlaybook() {
    try {
      const payload = buildPayload();
      const response = await fetch('/api/coaching/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Failed to generate playbook');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'playbook.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <Header />
      <main
        style={{
          minHeight: '100vh',
          background: '#06111f',
          color: '#e8f0fe',
          fontFamily: "'Inter', 'Jost', sans-serif",
          padding: '2rem clamp(1rem, 4vw, 3rem)',
        }}
      >
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            Intelligent Customer Engagement Operation Center · Agent Coaching
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Agent Coaching & Playbook Recommendation Engine
          </h1>

          <AgentCoachingDashboard
            transcriptIds={transcriptIds}
            onTranscriptIdsChange={setTranscriptIds}
            transcriptText={transcriptText}
            onTranscriptTextChange={setTranscriptText}
            team={team}
            onTeamChange={setTeam}
            queue={queue}
            onQueueChange={setQueue}
            flowId={flowId}
            onFlowIdChange={setFlowId}
            onAnalyze={handleAnalyze}
            onDownloadReport={handleDownloadReport}
            onDownloadPlaybook={handleDownloadPlaybook}
            output={output}
            isRunning={isRunning}
            error={error}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
