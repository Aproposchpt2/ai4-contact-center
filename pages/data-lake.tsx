'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DataLakeDashboard from '@/components/DataLakeDashboard';
import type { DataLakeRecord } from '@/lib/dataLakeEngine';

const SAMPLE_INGEST = JSON.stringify({
  records: [
    { source: 'transcripts', id: 'tr-1', payload: { intent: 'billing', sentiment: -0.3 }, timestamp: new Date().toISOString() },
    { source: 'runtime', id: 'rt-1', payload: { latencyMs: 820, node: 'transfer' }, timestamp: new Date().toISOString() },
  ],
}, null, 2);

const SAMPLE_QUERY = JSON.stringify({ source: 'transcripts', containsText: 'billing', limit: 25 }, null, 2);

export default function DataLakePage() {
  const [ingestInput, setIngestInput] = useState(SAMPLE_INGEST);
  const [queryInput, setQueryInput] = useState(SAMPLE_QUERY);
  const [state, setState] = useState<{ records: DataLakeRecord[] }>({ records: [] });
  const [rows, setRows] = useState<DataLakeRecord[]>([]);
  const [schema, setSchema] = useState<{ entities: Array<{ name: string; fields?: string[]; values?: string[] }>; lineage: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseIngest() {
    return JSON.parse(ingestInput) as { records: DataLakeRecord[] };
  }
  function parseQuery() {
    return JSON.parse(queryInput) as { source?: string; containsText?: string; limit?: number };
  }

  async function runIngest() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/datalake/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, records: parseIngest().records }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Ingest failed');
      setState(data.state);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runQuery() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/datalake/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, query: parseQuery() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Query failed');
      setRows(data.rows as DataLakeRecord[]);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runSchema() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/datalake/schema');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Schema failed');
      setSchema(data);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runExport() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/datalake/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, query: parseQuery() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Export failed');
      setRows(data.rows as DataLakeRecord[]);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  function download() {
    if (rows.length === 0) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-results.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter','Jost',sans-serif", padding: '2rem clamp(1rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            Stellar Unified Communications · System #25
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Data Lake & Unified Analytics Layer
          </h1>
          <DataLakeDashboard
            ingestInput={ingestInput}
            queryInput={queryInput}
            onIngestInputChange={setIngestInput}
            onQueryInputChange={setQueryInput}
            records={state.records}
            rows={rows}
            schema={schema}
            busy={busy}
            error={error}
            onIngest={runIngest}
            onQuery={runQuery}
            onSchema={runSchema}
            onExport={runExport}
            onDownload={download}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

