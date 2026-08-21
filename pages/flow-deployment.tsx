'use client';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlowDeploymentDashboard from '@/components/FlowDeploymentDashboard';
import type {
  DeploymentAuditEvent,
  DeploymentDiffReport,
  DeploymentReport,
  DeploymentSnapshot,
  EnvironmentName,
  EnvironmentRecord,
  PromotionReport,
  RollbackStatus,
  ValidationReport,
} from '@/lib/deploymentEngine';
import type { VersionRecord } from '@/lib/versioningEngine';

const EXAMPLE_FLOW = `{
  "menu": "Main Menu",
  "options": [
    { "key": 1, "label": "Admissions", "queue": "Admissions Queue" },
    { "key": 2, "label": "Billing", "queue": "Billing Queue" }
  ],
  "after_hours": "AfterHours Voicemail",
  "holiday": "Holiday Message"
}`;

type VersioningListResponse = {
  versions: VersionRecord[];
};

type DeploymentHistoryResponse = {
  environments: Record<EnvironmentName, EnvironmentRecord>;
  history: DeploymentSnapshot[];
  auditLog: DeploymentAuditEvent[];
};

const EMPTY_ENVS: Record<EnvironmentName, EnvironmentRecord> = {
  dev: { name: 'dev', currentSnapshotId: null, historySnapshotIds: [], locked: false },
  qa: { name: 'qa', currentSnapshotId: null, historySnapshotIds: [], locked: false },
  staging: { name: 'staging', currentSnapshotId: null, historySnapshotIds: [], locked: false },
  production: { name: 'production', currentSnapshotId: null, historySnapshotIds: [], locked: false },
};

export default function FlowDeploymentPage() {
  const [inputJson, setInputJson] = useState(EXAMPLE_FLOW);
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentName>('dev');
  const [promoteFrom, setPromoteFrom] = useState<EnvironmentName>('dev');
  const [promoteTo, setPromoteTo] = useState<EnvironmentName>('qa');
  const [diffA, setDiffA] = useState<EnvironmentName>('dev');
  const [diffB, setDiffB] = useState<EnvironmentName>('qa');
  const [environments, setEnvironments] = useState<Record<EnvironmentName, EnvironmentRecord>>(EMPTY_ENVS);
  const [history, setHistory] = useState<DeploymentSnapshot[]>([]);
  const [auditLog, setAuditLog] = useState<DeploymentAuditEvent[]>([]);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [deploymentReport, setDeploymentReport] = useState<DeploymentReport | null>(null);
  const [promotionReport, setPromotionReport] = useState<PromotionReport | null>(null);
  const [rollbackStatus, setRollbackStatus] = useState<RollbackStatus | null>(null);
  const [diffReport, setDiffReport] = useState<DeploymentDiffReport | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshotMap = useMemo(() => {
    const map = new Map<string, DeploymentSnapshot>();
    history.forEach((s) => map.set(s.id, s));
    return map;
  }, [history]);

  async function refreshVersionList() {
    const response = await fetch('/api/versioning/list');
    const data = (await response.json()) as VersioningListResponse | { error?: string };
    if (!response.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load versions');
    setVersions((data as VersioningListResponse).versions);
  }

  async function refreshDeploymentHistory() {
    const response = await fetch('/api/deployment/history');
    const data = (await response.json()) as DeploymentHistoryResponse | { error?: string };
    if (!response.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load deployment history');
    const payload = data as DeploymentHistoryResponse;
    setEnvironments(payload.environments);
    setHistory(payload.history);
    setAuditLog(payload.auditLog);
  }

  useEffect(() => {
    Promise.all([refreshVersionList(), refreshDeploymentHistory()]).catch((e: Error) => setError(e.message));
  }, []);

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setInputJson(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError('Invalid JSON file.');
    }
  }

  function getFlowFromInput() {
    return JSON.parse(inputJson) as Record<string, unknown>;
  }

  async function handleValidate() {
    setError(null);
    setIsBusy(true);
    try {
      const body =
        selectedVersionId.length > 0
          ? { versionId: selectedVersionId }
          : { flow: getFlowFromInput() };
      const response = await fetch('/api/deployment/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Validation failed');
      setValidationReport(data as ValidationReport);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeploy() {
    setError(null);
    setIsBusy(true);
    try {
      const body =
        selectedVersionId.length > 0
          ? { environment: selectedEnvironment, versionId: selectedVersionId, user: 'jeffery', notes: 'Deployed from Flow Deployment UI' }
          : { environment: selectedEnvironment, flow: getFlowFromInput(), user: 'jeffery', notes: 'Deployed from Flow Deployment UI' };
      const response = await fetch('/api/deployment/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Deployment failed');
      setDeploymentReport(data as DeploymentReport);
      setValidationReport((data as DeploymentReport).validation);
      await refreshDeploymentHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePromote() {
    setError(null);
    setIsBusy(true);
    try {
      if (!selectedVersionId) throw new Error('Select a canonical flow version to promote.');
      const response = await fetch('/api/deployment/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEnvironment: promoteFrom,
          toEnvironment: promoteTo,
          versionId: selectedVersionId,
          notes: 'Promoted from Flow Deployment UI',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Promotion failed');
      setPromotionReport(data as PromotionReport);
      setValidationReport((data as PromotionReport).validation);
      await refreshDeploymentHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRollback() {
    setError(null);
    setIsBusy(true);
    try {
      const response = await fetch('/api/deployment/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: selectedEnvironment, user: 'jeffery' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Rollback failed');
      setRollbackStatus(data as RollbackStatus);
      await refreshDeploymentHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDiff() {
    setError(null);
    setIsBusy(true);
    try {
      const response = await fetch('/api/deployment/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentA: diffA, environmentB: diffB }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Environment diff failed');
      setDiffReport(data as DeploymentDiffReport);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  function handleDownloadSnapshot(snapshotId: string) {
    const snapshot = snapshotMap.get(snapshotId);
    if (!snapshot) {
      setError('Snapshot not found.');
      return;
    }
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.environment}-${snapshot.id}.json`;
    a.click();
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
            AI4 Contact Center · Flow Deployment
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Flow Deployment & Environment Manager
          </h1>

          <FlowDeploymentDashboard
            inputJson={inputJson}
            onInputJsonChange={setInputJson}
            onFileUpload={handleFileUpload}
            selectedVersionId={selectedVersionId}
            onSelectedVersionId={setSelectedVersionId}
            versions={versions}
            selectedEnvironment={selectedEnvironment}
            onSelectedEnvironment={setSelectedEnvironment}
            promoteFrom={promoteFrom}
            promoteTo={promoteTo}
            onPromoteFrom={setPromoteFrom}
            onPromoteTo={setPromoteTo}
            diffA={diffA}
            diffB={diffB}
            onDiffA={setDiffA}
            onDiffB={setDiffB}
            environments={environments}
            history={history}
            auditLog={auditLog}
            validationReport={validationReport}
            deploymentReport={deploymentReport}
            promotionReport={promotionReport}
            rollbackStatus={rollbackStatus}
            diffReport={diffReport}
            isBusy={isBusy}
            error={error}
            onValidate={handleValidate}
            onDeploy={handleDeploy}
            onPromote={handlePromote}
            onRollback={handleRollback}
            onDiff={handleDiff}
            onDownloadSnapshot={handleDownloadSnapshot}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
