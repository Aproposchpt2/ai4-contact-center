'use client';
import { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlowSimulatorDashboard, { type SimulatorConfigState } from '@/components/FlowSimulatorDashboard';
import type { FlowScript, SimulationReport } from '@/lib/simulationEngine';

const DEFAULT_CONFIG: SimulatorConfigState = {
  concurrency: 20,
  arrivalRate: 5,
  averageDurationMs: 120000,
  maxInteractions: 200,
  burstMode: false,
  randomization: true,
};

const EXAMPLE_FLOW = `{
  "menu": "Main Menu",
  "options": [
    { "key": 1, "label": "Admissions", "queue": "Admissions_Queue" },
    { "key": 2, "label": "Financial Aid", "queue": "FinancialAid_Queue" },
    { "key": 3, "label": "Operator", "queue": "Operator_Queue" }
  ],
  "after_hours": "Voicemail_Main",
  "holiday": "Holiday_Message"
}`;

export default function FlowSimulatorPage() {
  const [inputJson, setInputJson] = useState(EXAMPLE_FLOW);
  const [config, setConfig] = useState<SimulatorConfigState>(DEFAULT_CONFIG);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setInputJson(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError('Invalid JSON file. Please upload a valid flow model.');
    }
  }

  async function handleRunSimulation() {
    setError(null);
    setReport(null);
    setProgress(0);

    let script: FlowScript;
    try {
      script = JSON.parse(inputJson) as FlowScript;
    } catch {
      setError('Flow JSON is invalid.');
      return;
    }

    setIsRunning(true);
    progressTimer.current = setInterval(() => {
      setProgress((p) => Math.min(92, p + Math.max(2, Math.floor((100 - p) / 10))));
    }, 250);

    try {
      const response = await fetch('/api/run-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, config }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Failed to run simulation.');
        return;
      }
      setReport(data as SimulationReport);
      setProgress(100);
    } catch {
      setError('Network error while running simulation.');
    } finally {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      setIsRunning(false);
    }
  }

  function handleDownloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulation-report.json';
    link.click();
    URL.revokeObjectURL(url);
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
            AI4 Contact Center · Flow Simulator & Stress Tester
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Flow Simulator
          </h1>

          <FlowSimulatorDashboard
            inputJson={inputJson}
            onInputJsonChange={setInputJson}
            config={config}
            onConfigChange={setConfig}
            onFileUpload={handleFileUpload}
            onRunSimulation={handleRunSimulation}
            onDownloadReport={handleDownloadReport}
            isRunning={isRunning}
            progress={progress}
            report={report}
            error={error}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

