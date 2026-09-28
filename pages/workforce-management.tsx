'use client';
import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkforceManagementDashboard from '@/components/WorkforceManagementDashboard';
import type { Agent, ForecastResult, RealtimeResult, ScheduleResult, WorkforceReport } from '@/lib/workforceManagementEngine';

const SAMPLE_DATA = JSON.stringify(
  Array.from({ length: 48 }).map((_, idx) => ({
    timestamp: new Date(Date.now() - (48 - idx) * 3600_000).toISOString(),
    volume: idx % 24 >= 9 && idx % 24 <= 17 ? 120 : 65,
    avgHandleTimeSeconds: idx % 5 === 0 ? 500 : 430,
    intent: idx % 3 === 0 ? 'billing' : 'support',
    queue: idx % 3 === 0 ? 'queue-billing' : 'queue-support',
    channel: idx % 2 === 0 ? 'voice' : 'chat',
  })),
  null,
  2,
);

const DEFAULT_AGENTS: Agent[] = [
  { id: 'a1', name: 'Maya Tran', skills: ['billing', 'de-escalation'], channels: ['voice', 'chat'], availableHours: [8, 9, 10, 11, 12, 13, 14, 15] },
  { id: 'a2', name: 'Jordan Lee', skills: ['technical', 'support'], channels: ['chat', 'email'], availableHours: [9, 10, 11, 12, 13, 14, 15, 16] },
  { id: 'a3', name: 'Priya Shah', skills: ['retention', 'billing'], channels: ['voice'], availableHours: [10, 11, 12, 13, 14, 15, 16, 17] },
  { id: 'a4', name: 'Noah Patel', skills: ['support', 'self-service'], channels: ['chat', 'self-service'], availableHours: [7, 8, 9, 10, 11, 12, 13, 14] },
];

export default function WorkforceManagementPage() {
  const [rawData, setRawData] = useState(SAMPLE_DATA);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [realtime, setRealtime] = useState<RealtimeResult | null>(null);
  const [report, setReport] = useState<WorkforceReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agents = useMemo(() => DEFAULT_AGENTS, []);

  function parseData() {
    return JSON.parse(rawData) as Array<{ timestamp: string; volume: number; avgHandleTimeSeconds: number; intent?: string; queue?: string; channel?: 'voice' | 'chat' | 'email' | 'self-service' }>;
  }

  async function runForecast() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/wfm/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historicalData: parseData(), forecastHours: 24 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Forecast failed');
      setForecast(data.forecast as ForecastResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runSchedule() {
    if (!forecast) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/wfm/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forecast, agents, requiredSkills: ['billing', 'support'], queue: 'queue-general', channel: 'voice' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Schedule failed');
      setSchedule(data.schedule as ScheduleResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runRealtime() {
    if (!forecast) return;
    setBusy(true);
    setError(null);
    try {
      const staffing = forecast.windows.map((w) => ({ hourIndex: w.hourIndex, staffedAgents: Math.max(1, w.requiredAgents - (w.hourIndex % 3 === 0 ? 2 : 0)) }));
      const response = await fetch('/api/wfm/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forecast,
          currentStaffingByHour: staffing,
          liveQueueDepthByHour: forecast.windows.map((w) => ({ hourIndex: w.hourIndex, queueDepth: w.hourIndex % 4 === 0 ? 22 : 7 })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Realtime analysis failed');
      setRealtime(data.realtime as RealtimeResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runReport() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/wfm/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forecastInput: { historicalData: parseData(), forecastHours: 24 },
          scheduleInput: { agents, requiredSkills: ['billing', 'support'], queue: 'queue-general', channel: 'voice' },
          realtimeStaffing: Array.from({ length: 24 }).map((_, hour) => ({ hourIndex: hour, staffedAgents: hour % 5 === 0 ? 6 : 10 })),
          liveQueueDepthByHour: Array.from({ length: 24 }).map((_, hour) => ({ hourIndex: hour, queueDepth: hour % 6 === 0 ? 30 : 8 })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Report generation failed');
      setReport(data.report as WorkforceReport);
      setForecast((data.report as WorkforceReport).forecast);
      setRealtime((data.report as WorkforceReport).realtime);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function download(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            Stellar Unified Communications · System #20
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Workforce Management & Forecasting Engine
          </h1>
          <WorkforceManagementDashboard
            rawData={rawData}
            onRawDataChange={setRawData}
            agents={agents}
            forecast={forecast}
            schedule={schedule}
            realtime={realtime}
            report={report}
            busy={busy}
            error={error}
            onForecast={runForecast}
            onSchedule={runSchedule}
            onRealtime={runRealtime}
            onReport={runReport}
            onDownloadWorkforce={() => report && download(report, 'workforce-report.json')}
            onDownloadSchedule={() => schedule && download(schedule, 'schedule.json')}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

