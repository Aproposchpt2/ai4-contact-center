'use client';
import { useCallback, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlowRuntimeMonitorDashboard from '@/components/FlowRuntimeMonitorDashboard';
import type {
  RuntimeEnvironment,
  RuntimeEvent,
  RuntimeIncident,
  RuntimeMetrics,
  RuntimeSeverity,
} from '@/lib/runtimeMonitorEngine';

type EventsResponse = {
  events: RuntimeEvent[];
  metrics: RuntimeMetrics;
  incidents: RuntimeIncident[];
  availableFlows: string[];
  availableNodes: string[];
};

export default function FlowRuntimeMonitorPage() {
  const [environment, setEnvironment] = useState<RuntimeEnvironment>('dev');
  const [flowFilter, setFlowFilter] = useState('');
  const [nodeFilter, setNodeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState<RuntimeSeverity | 'all'>('all');
  const [minutes, setMinutes] = useState(30);
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [incidents, setIncidents] = useState<RuntimeIncident[]>([]);
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null);
  const [availableFlows, setAvailableFlows] = useState<string[]>([]);
  const [availableNodes, setAvailableNodes] = useState<string[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('environment', environment);
    params.set('minutes', String(minutes));
    if (flowFilter) params.set('flowId', flowFilter);
    if (nodeFilter) params.set('nodeId', nodeFilter);
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    return params.toString();
  }, [environment, flowFilter, nodeFilter, severityFilter, minutes]);

  const refresh = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/runtime/events?${query}`);
      const data = (await response.json()) as EventsResponse | { error?: string };
      if (!response.ok) throw new Error((data as { error?: string }).error ?? 'Failed to fetch runtime events');
      const payload = data as EventsResponse;
      setEvents(payload.events);
      setIncidents(payload.incidents);
      setMetrics(payload.metrics);
      setAvailableFlows(payload.availableFlows);
      setAvailableNodes(payload.availableNodes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  async function handleAcknowledge(incidentId: string) {
    setError(null);
    try {
      const response = await fetch('/api/runtime/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, operator: 'jeffery' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Failed to acknowledge incident');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleMute(incidentId: string) {
    setError(null);
    try {
      const response = await fetch('/api/runtime/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, durationMinutes: 30, operator: 'jeffery' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Failed to mute incident');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDownloadIncidentReport(incidentId: string) {
    setError(null);
    try {
      const response = await fetch('/api/runtime/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, environment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Failed to generate incident report');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'incident-report.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleCreateTicket(incidentId: string) {
    const incident = incidents.find((item) => item.id === incidentId);
    if (!incident) return;
    const payload = {
      title: `[${incident.severity.toUpperCase()}] Runtime incident ${incident.rule}`,
      environment: incident.environment,
      flow: incident.flowId,
      node: incident.nodeId,
      status: incident.status,
      impact: incident.impact,
      remediationNotes: incident.remediationNotes,
      openedAt: incident.openedAt,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ticket-draft-${incident.id}.json`;
    anchor.click();
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
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            AI4 Contact Center · On-Demand Runtime Monitor
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Flow Runtime Monitor & Incident Console
          </h1>

          <FlowRuntimeMonitorDashboard
            environment={environment}
            onEnvironmentChange={setEnvironment}
            flowFilter={flowFilter}
            onFlowFilterChange={setFlowFilter}
            nodeFilter={nodeFilter}
            onNodeFilterChange={setNodeFilter}
            severityFilter={severityFilter}
            onSeverityFilterChange={setSeverityFilter}
            minutes={minutes}
            onMinutesChange={setMinutes}
            availableFlows={availableFlows}
            availableNodes={availableNodes}
            events={events}
            incidents={incidents}
            metrics={metrics}
            selectedIncidentId={selectedIncidentId}
            onSelectIncidentId={setSelectedIncidentId}
            onRefresh={refresh}
            onAcknowledge={handleAcknowledge}
            onMute={handleMute}
            onDownloadIncidentReport={handleDownloadIncidentReport}
            onCreateTicket={handleCreateTicket}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}