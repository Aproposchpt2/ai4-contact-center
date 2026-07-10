'use client';
import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlowVersioningDashboard from '@/components/FlowVersioningDashboard';
import type {
  AuditEvent,
  BranchRecord,
  DiffReport,
  MergeReport,
  VersionRecord,
} from '@/lib/versioningEngine';

const EXAMPLE_FLOW = `{
  "menu": "Main Menu",
  "options": [
    { "key": 1, "label": "Admissions", "queue": "Admissions_Queue" },
    { "key": 2, "label": "Financial Aid", "queue": "FinancialAid_Queue" }
  ],
  "after_hours": "Voicemail_Main",
  "holiday": "Holiday_Message"
}`;

type VersioningListResponse = {
  versions: VersionRecord[];
  branches: BranchRecord[];
  auditLog: AuditEvent[];
  currentVersionId: string | null;
  currentBranch: string;
};

export default function FlowVersioningPage() {
  const [inputJson, setInputJson] = useState(EXAMPLE_FLOW);
  const [notes, setNotes] = useState('Initial flow snapshot');
  const [user, setUser] = useState('jeffery');
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');
  const [diffReport, setDiffReport] = useState<DiffReport | null>(null);
  const [mergeReport, setMergeReport] = useState<MergeReport | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const versionMap = useMemo(() => {
    const map = new Map<string, VersionRecord>();
    versions.forEach((v) => map.set(v.id, v));
    return map;
  }, [versions]);

  async function refreshList() {
    const res = await fetch('/api/versioning/list');
    const data = (await res.json()) as VersioningListResponse | { error?: string };
    if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load versions');
    const payload = data as VersioningListResponse;
    setVersions(payload.versions);
    setBranches(payload.branches);
    setAuditLog(payload.auditLog);
    setCurrentBranch(payload.currentBranch);
  }

  useEffect(() => {
    refreshList().catch((e: Error) => setError(e.message));
  }, []);

  async function handleSaveVersion() {
    setError(null);
    setIsBusy(true);
    try {
      const flow = JSON.parse(inputJson) as Record<string, unknown>;
      const res = await fetch('/api/versioning/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow, notes, user, branch: currentBranch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to save version');
      await refreshList();
      setNotes('Saved new version');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRunDiff() {
    if (!selectedA || !selectedB) {
      setError('Select two versions for diff.');
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      const res = await fetch('/api/versioning/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromVersionId: selectedA, toVersionId: selectedB }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to diff versions');
      setDiffReport(data as DiffReport);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRollback(versionId: string) {
    setError(null);
    setIsBusy(true);
    try {
      const res = await fetch('/api/versioning/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed rollback');
      await refreshList();
      const version = versionMap.get(versionId);
      if (version) setInputJson(JSON.stringify(version.flow, null, 2));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateBranch(name: string) {
    setError(null);
    setIsBusy(true);
    try {
      const res = await fetch('/api/versioning/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed branch creation');
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSwitchBranch(name: string) {
    setError(null);
    setIsBusy(true);
    try {
      const res = await fetch('/api/versioning/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch', name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed branch switch');
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMergeBranch(sourceBranch: string) {
    setError(null);
    setIsBusy(true);
    try {
      const res = await fetch('/api/versioning/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceBranch, targetBranch: 'main' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed merge');
      setMergeReport(data as MergeReport);
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  function handleDownloadVersion(versionId: string) {
    const version = versionMap.get(versionId);
    if (!version) {
      setError('Version not found for download.');
      return;
    }
    const blob = new Blob([JSON.stringify(version.flow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-version-v${version.versionNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleViewVersion(versionId: string) {
    const version = versionMap.get(versionId);
    if (!version) return;
    setInputJson(JSON.stringify(version.flow, null, 2));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
            AI4 Contact Center · Flow Versioning
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Flow Versioning, Diffing & Rollback Manager
          </h1>

          <FlowVersioningDashboard
            inputJson={inputJson}
            onInputJsonChange={setInputJson}
            notes={notes}
            onNotesChange={setNotes}
            user={user}
            onUserChange={setUser}
            currentBranch={currentBranch}
            branches={branches}
            versions={versions}
            selectedA={selectedA}
            selectedB={selectedB}
            onSelectA={setSelectedA}
            onSelectB={setSelectedB}
            diffReport={diffReport}
            mergeReport={mergeReport}
            auditLog={auditLog}
            isBusy={isBusy}
            error={error}
            onFileUpload={handleFileUpload}
            onSaveVersion={handleSaveVersion}
            onRunDiff={handleRunDiff}
            onRollback={handleRollback}
            onDownloadVersion={handleDownloadVersion}
            onCreateBranch={handleCreateBranch}
            onSwitchBranch={handleSwitchBranch}
            onMergeBranch={handleMergeBranch}
            onViewVersion={handleViewVersion}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

