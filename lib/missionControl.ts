export type MissionControlStatus = 'operational' | 'degraded' | 'attention_required' | 'unknown';
export type ChannelStatus = 'operational' | 'degraded' | 'unavailable' | 'unknown';
export type ModuleMaturity = 'canonical' | 'runtime_integrated' | 'functional_noncanonical' | 'development' | 'configuration_only';

export type MissionControlModule = {
  id: string;
  name: string;
  route: string;
  group: string;
  maturity: ModuleMaturity;
};

export const missionControlModules: MissionControlModule[] = [
  { id: 'flow-library', name: 'Flow Library', route: '/dashboard', group: 'Flow Authoring', maturity: 'canonical' },
  { id: 'builder', name: 'Builder', route: '/builder', group: 'Flow Authoring', maturity: 'canonical' },
  { id: 'designer', name: 'Designer', route: '/designer', group: 'Flow Authoring', maturity: 'development' },
  { id: 'troubleshooter', name: 'Troubleshooter', route: '/troubleshooter', group: 'Flow Authoring', maturity: 'development' },
  { id: 'routing-optimizer', name: 'Routing Optimizer', route: '/routing-optimizer', group: 'Flow Authoring', maturity: 'development' },
  { id: 'flow-simulator', name: 'Flow Simulator', route: '/flow-simulator', group: 'Flow Authoring', maturity: 'canonical' },
  { id: 'flow-auto-repair', name: 'Flow Auto-Repair', route: '/flow-auto-repair', group: 'Flow Authoring', maturity: 'development' },
  { id: 'flow-rewrite', name: 'Flow Rewrite', route: '/flow-rewrite', group: 'Flow Authoring', maturity: 'development' },
  { id: 'flow-versioning', name: 'Flow Versioning', route: '/flow-versioning', group: 'Release & Runtime', maturity: 'canonical' },
  { id: 'flow-deployment', name: 'Flow Deployment', route: '/flow-deployment', group: 'Release & Runtime', maturity: 'canonical' },
  { id: 'runtime-monitor', name: 'Runtime Monitor', route: '/flow-runtime-monitor', group: 'Release & Runtime', maturity: 'runtime_integrated' },
  { id: 'agent-workspace', name: 'Agent Workspace', route: '/agent-workspace', group: 'Release & Runtime', maturity: 'canonical' },
  { id: 'voice-operations', name: 'Voice Operations & Analytics', route: '/voice-operations', group: 'Release & Runtime', maturity: 'canonical' },
  { id: 'transcript-intelligence', name: 'Transcript Intelligence', route: '/transcript-intelligence', group: 'Intelligence', maturity: 'canonical' },
  { id: 'agent-assist', name: 'Agent Assist', route: '/agent-assist', group: 'Intelligence', maturity: 'runtime_integrated' },
  { id: 'agent-coaching', name: 'Agent Coaching', route: '/agent-coaching', group: 'Intelligence', maturity: 'development' },
  { id: 'intent-taxonomy', name: 'Intent Taxonomy', route: '/intent-taxonomy', group: 'Intelligence', maturity: 'functional_noncanonical' },
  { id: 'knowledge-vault', name: 'Knowledge Vault', route: '/knowledge-vault', group: 'Intelligence', maturity: 'functional_noncanonical' },
  { id: 'analytics', name: 'Analytics Engine', route: '/analytics-engine', group: 'Intelligence', maturity: 'development' },
  { id: 'workforce', name: 'Workforce Management', route: '/workforce-management', group: 'Workforce & Experience', maturity: 'development' },
  { id: 'skill-matrix', name: 'Agent Skill Matrix', route: '/agent-skill-matrix', group: 'Workforce & Experience', maturity: 'development' },
  { id: 'journey-designer', name: 'Journey Designer', route: '/journey-designer', group: 'Workforce & Experience', maturity: 'development' },
  { id: 'quality-assurance', name: 'Quality Assurance', route: '/quality-assurance', group: 'Governance & Assurance', maturity: 'runtime_integrated' },
  { id: 'compliance', name: 'Compliance Automation', route: '/compliance-automation', group: 'Governance & Assurance', maturity: 'runtime_integrated' },
  { id: 'flow-governance', name: 'Flow Governance', route: '/flow-governance', group: 'Governance & Assurance', maturity: 'development' },
  { id: 'localization', name: 'Localization Engine', route: '/localization-engine', group: 'Platform Services', maturity: 'development' },
  { id: 'data-lake', name: 'Data Lake', route: '/data-lake', group: 'Platform Services', maturity: 'development' },
  { id: 'experimentation', name: 'Experiments', route: '/experimentation', group: 'Platform Services', maturity: 'development' },
  { id: 'cost-optimizer', name: 'Cost Optimizer', route: '/cost-optimizer', group: 'Platform Services', maturity: 'development' },
  { id: 'integration-hub', name: 'Integration Hub', route: '/integration-hub', group: 'Platform Services', maturity: 'configuration_only' },
  { id: 'prompt-manager', name: 'Prompt Manager', route: '/prompt-manager', group: 'Platform Services', maturity: 'development' },
];

export function derivePlatformStatus(input: {
  hasTenant: boolean;
  hasFlowVersion: boolean;
  deploymentReadable: boolean;
  runtimeReadable: boolean;
  openComplianceFindings: number;
}): MissionControlStatus {
  if (!input.hasTenant) return 'unknown';
  if (!input.deploymentReadable || !input.runtimeReadable) return 'degraded';
  if (!input.hasFlowVersion || input.openComplianceFindings > 0) return 'attention_required';
  return 'operational';
}

export function deriveChannelStatus(input: {
  reachable: boolean;
  ok?: boolean;
  queueReady?: boolean;
  flowVersionReady?: boolean;
  runtimeRouting?: boolean;
}): ChannelStatus {
  if (!input.reachable) return 'unavailable';
  if (input.ok === false) return 'unavailable';
  if (input.ok !== true) return 'unknown';
  if (!input.queueReady || !input.flowVersionReady || !input.runtimeRouting) return 'degraded';
  return 'operational';
}
