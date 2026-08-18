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

type CanonicalVersion = {
  id: string;
  flowId: string;
  flowName: string;
  versionNumber: number;
  timestamp: string;
  flow: FlowScript;
  validationStatus?: string;
};

type VersionListResponse = { versions: CanonicalVersion[] };

type SimulationResponse = SimulationReport & {
  canonical?: { versionId: string; flowId: string; version: number; flowName: string };
};

export default function FlowSimulatorPage() {
  const [inputJson, setInputJson] = useState(EXAMPLE_FLOW);
  const [versions, setVersions] = useState<CanonicalVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [config, setConfig] = useState<SimulatorConfigState>(DEFAULT_CONFIG);
  const [report, setReport] = useState<SimulationResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/versioning/list')
      .then(async (response) => {
        const data = (await response.json()) as VersionListResponse | { error?: string };
        if (!response.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load saved versions');
        const rows = (data as VersionListResponse).versions ?? [];
        setVersions(rows);
      })
      .catch((e: Error) => setError(e.message));

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  function selectSavedVersion(versionId: string) {
    setSelectedVersionId(versionId);
    if (!versionId) return;
    const version = versions.find((item) => item.id === versionId);
    if (version) {
      setInputJson(JSON.stringify(version.flow, null, 2));
      setError(null);
      setReport(null);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setSelectedVersionId('');
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

    let script: FlowScript | undefined;
    if (!selectedVersionId) {
      try {
        script = JSON.parse(inputJson) as FlowScript;
      } catch {
        setError('Flow JSON is invalid.');
        return;
      }
    }

    setIsRunning(true);
    progressTimer.current = setInterval(() => {
      setProgress((p) => Math.min(92, p + Math.max(2, Math.floor((100 - p) / 10))));
    }, 250);

    try {
      const response = await fetch('/api/run-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedVersionId ? { versionId: selectedVersionId, config } : { script, config }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Failed to run simulation.');
        return;
      }
      setReport(data as SimulationResponse);
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
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.canonical
      ? `${report.canonical.flowName.replace(/[^a-z0-9_-]+/gi, '-')}-v${report.canonical.version}-simulation.json`
      : 'simulation-report.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', 'Jost', sans-serif", padding: '2rem clamp(1rem, 4vw, 3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            AI4 Contact Center · Flow Simulator & Stress Tester
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>Flow Simulator</h1>

          <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid rgba(91,211,255,.2)', borderRadius: '8px', background: 'rgba(91,211,255,.04)' }}>
            <label style={{ display: 'block', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.5rem' }}>
              Canonical saved version
            </label>
            <select
              value={selectedVersionId}
              onChange={(e) => selectSavedVersion(e.target.value)}
              style={{ width: '100%', background: '#0b1b2d', color: '#e8f0fe', border: '1px solid rgba(255,255,255,.14)', borderRadius: '6px', padding: '.7rem .8rem' }}
            >
              <option value="">Ad-hoc JSON / uploaded flow</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.flowName} · v{version.versionNumber}{version.validationStatus ? ` · ${version.validationStatus}` : ''}
                </option>
              ))}
            </select>
            <p style={{ margin: '.55rem 0 0', color: 'rgba(255,255,255,.45)', fontSize: '.76rem' }}>
              Select a saved version to simulate the exact canonical definition that can be validated and deployed.
            </p>
          </div>

          <FlowSimulatorDashboard
            inputJson={inputJson}
            onInputJsonChange={(value) => { setSelectedVersionId(''); setInputJson(value); }}
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
