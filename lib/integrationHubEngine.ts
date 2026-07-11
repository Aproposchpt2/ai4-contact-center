export type IntegrationSystem = {
  id: string;
  name: string;
  type: 'crm' | 'ticketing' | 'identity' | 'telephony' | 'analytics' | 'other';
  endpoint: string;
  enabled: boolean;
};

export type IntegrationEvent = {
  id: string;
  source: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type IntegrationWorkflow = {
  id: string;
  name: string;
  steps: string[];
};

export function registerSystems(systems: IntegrationSystem[]) {
  return systems.map((s) => ({ ...s, registeredAt: new Date().toISOString() }));
}

export function routeEvents(events: IntegrationEvent[], systems: IntegrationSystem[]) {
  const enabled = systems.filter((s) => s.enabled);
  return events.map((event) => ({
    eventId: event.id,
    routedTo: enabled.map((s) => s.id),
    status: enabled.length > 0 ? 'routed' : 'dropped',
  }));
}

export function executeWorkflow(workflow: IntegrationWorkflow, event: IntegrationEvent) {
  return {
    workflowId: workflow.id,
    eventId: event.id,
    executedSteps: workflow.steps,
    status: 'completed',
    output: { transformed: true, targetKey: `${event.source}:${event.eventType}` },
  };
}

export function integrationLogs(events: IntegrationEvent[]) {
  return events.map((e) => ({
    id: `log-${e.id}`,
    eventId: e.id,
    level: 'info',
    message: `Processed ${e.eventType} from ${e.source}`,
    timestamp: new Date().toISOString(),
  }));
}

export function exportIntegrationConfig(params: { systems: IntegrationSystem[]; workflows: IntegrationWorkflow[] }) {
  return {
    systems: params.systems,
    workflows: params.workflows,
    exportedAt: new Date().toISOString(),
  };
}

