import fs from 'fs';
import path from 'path';

export type TaxonomyChannel = 'voice' | 'chat' | 'email' | 'self-service';
export type IntentPriority = 'low' | 'medium' | 'high' | 'critical';

export type IntentSLA = {
  targetSeconds: number;
  escalationSeconds: number;
};

export type RoutingMapping = {
  flowId?: string;
  queueId?: string;
  channel?: TaxonomyChannel;
  priority?: IntentPriority;
  fallbackQueueId?: string;
  escalationQueueId?: string;
};

export type IntentNode = {
  id: string;
  name: string;
  parentId: string | null;
  description: string;
  examples: string[];
  channels: TaxonomyChannel[];
  priority: IntentPriority;
  sla: IntentSLA;
  routing: RoutingMapping;
  createdAt: string;
  updatedAt: string;
};

export type RoutingStrategy = {
  intentId: string;
  intentName: string;
  flowId: string;
  queueId: string;
  channel: TaxonomyChannel;
  priority: IntentPriority;
  sla: IntentSLA;
  fallbackQueueId: string;
  escalationQueueId: string;
};

export type ValidationReport = {
  warnings: string[];
  errors: string[];
};

export type TaxonomyState = {
  intents: IntentNode[];
};

type ExportPayload = {
  taxonomy: IntentNode[];
  routingStrategies: RoutingStrategy[];
  validation: ValidationReport;
  recommendations: string[];
  summary: {
    intentCount: number;
    rootCount: number;
    subIntentCount: number;
    mappedIntents: number;
    unmappedIntents: number;
  };
};

const STORE_PATH = path.join(process.cwd(), '.ai4-intent-taxonomy-store.json');

const SEED_INTENTS: IntentNode[] = [
  {
    id: 'intent-billing',
    name: 'Billing Support',
    parentId: null,
    description: 'Customer inquiries related to invoices, charges, and payments.',
    examples: ['I have a charge I do not recognize', 'My payment failed', 'Send me my invoice'],
    channels: ['voice', 'chat', 'email'],
    priority: 'high',
    sla: { targetSeconds: 120, escalationSeconds: 300 },
    routing: { flowId: 'flow-billing', queueId: 'queue-billing', channel: 'voice', priority: 'high', fallbackQueueId: 'queue-general', escalationQueueId: 'queue-billing-supervisor' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'intent-billing-dispute',
    name: 'Billing Dispute',
    parentId: 'intent-billing',
    description: 'Formal disputes of charges or invoices.',
    examples: ['I want to dispute this charge', 'This bill is wrong'],
    channels: ['voice', 'email'],
    priority: 'critical',
    sla: { targetSeconds: 90, escalationSeconds: 180 },
    routing: { flowId: 'flow-billing', queueId: 'queue-billing-dispute', channel: 'voice', priority: 'critical', fallbackQueueId: 'queue-billing', escalationQueueId: 'queue-billing-supervisor' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'intent-tech',
    name: 'Technical Support',
    parentId: null,
    description: 'Troubleshooting errors, failures, and system issues.',
    examples: ['It is not working', 'I keep getting an error', 'App crashed'],
    channels: ['voice', 'chat', 'self-service'],
    priority: 'high',
    sla: { targetSeconds: 180, escalationSeconds: 420 },
    routing: { flowId: 'flow-support', queueId: 'queue-tech', channel: 'chat', priority: 'high', fallbackQueueId: 'queue-general', escalationQueueId: 'queue-tech-tier2' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'intent-account',
    name: 'Account Management',
    parentId: null,
    description: 'Profile updates, plan changes, and account access.',
    examples: ['I need to update my address', 'Change my plan', 'Reset my password'],
    channels: ['voice', 'chat', 'email', 'self-service'],
    priority: 'medium',
    sla: { targetSeconds: 240, escalationSeconds: 600 },
    routing: { flowId: 'flow-account', queueId: 'queue-account', channel: 'self-service', priority: 'medium', fallbackQueueId: 'queue-general', escalationQueueId: 'queue-account-supervisor' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'intent-general',
    name: 'General Inquiry',
    parentId: null,
    description: 'Unclassified or miscellaneous questions.',
    examples: ['I have a question', 'I need some information'],
    channels: ['voice', 'chat'],
    priority: 'low',
    sla: { targetSeconds: 360, escalationSeconds: 900 },
    routing: { flowId: 'flow-main', queueId: 'queue-general', channel: 'voice', priority: 'low', fallbackQueueId: 'queue-general', escalationQueueId: 'queue-general-supervisor' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readState(): TaxonomyState {
  if (!fs.existsSync(STORE_PATH)) {
    return { intents: deepClone(SEED_INTENTS) };
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as TaxonomyState;
    if (!parsed || !Array.isArray(parsed.intents)) return { intents: deepClone(SEED_INTENTS) };
    return parsed;
  } catch {
    return { intents: deepClone(SEED_INTENTS) };
  }
}

function writeState(state: TaxonomyState) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

export function listIntents() {
  const state = readState();
  const roots = state.intents.filter((intent) => intent.parentId === null);
  const children = state.intents.filter((intent) => intent.parentId !== null);
  return {
    intents: deepClone(state.intents),
    hierarchy: roots.map((root) => ({
      ...deepClone(root),
      children: children.filter((child) => child.parentId === root.id).map((child) => deepClone(child)),
    })),
    total: state.intents.length,
  };
}

export function saveIntent(params: {
  id?: string;
  name: string;
  parentId?: string | null;
  description?: string;
  examples?: string[];
  channels?: TaxonomyChannel[];
  priority?: IntentPriority;
  sla?: Partial<IntentSLA>;
  routing?: Partial<RoutingMapping>;
}): IntentNode {
  const state = readState();
  const existing = params.id ? state.intents.find((intent) => intent.id === params.id) : undefined;
  const now = nowIso();

  const updated: IntentNode = {
    id: existing?.id ?? makeId('intent'),
    name: params.name.trim(),
    parentId: params.parentId !== undefined ? (params.parentId ?? null) : (existing?.parentId ?? null),
    description: params.description ?? existing?.description ?? '',
    examples: params.examples ?? existing?.examples ?? [],
    channels: params.channels ?? existing?.channels ?? ['voice'],
    priority: params.priority ?? existing?.priority ?? 'medium',
    sla: {
      targetSeconds: params.sla?.targetSeconds ?? existing?.sla?.targetSeconds ?? 240,
      escalationSeconds: params.sla?.escalationSeconds ?? existing?.sla?.escalationSeconds ?? 600,
    },
    routing: {
      flowId: params.routing?.flowId ?? existing?.routing?.flowId ?? 'flow-main',
      queueId: params.routing?.queueId ?? existing?.routing?.queueId ?? 'queue-general',
      channel: params.routing?.channel ?? existing?.routing?.channel ?? 'voice',
      priority: params.routing?.priority ?? existing?.routing?.priority ?? 'medium',
      fallbackQueueId: params.routing?.fallbackQueueId ?? existing?.routing?.fallbackQueueId ?? 'queue-general',
      escalationQueueId: params.routing?.escalationQueueId ?? existing?.routing?.escalationQueueId ?? 'queue-supervisor',
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    const idx = state.intents.findIndex((intent) => intent.id === existing.id);
    state.intents[idx] = updated;
  } else {
    state.intents.push(updated);
  }

  writeState(state);
  return deepClone(updated);
}

export function deleteIntent(id: string, force = false): { deleted: string; orphaned: string[] } {
  const state = readState();
  const target = state.intents.find((intent) => intent.id === id);
  if (!target) throw new Error('Intent not found');

  const children = state.intents.filter((intent) => intent.parentId === id);
  if (children.length > 0 && !force) {
    throw new Error(`Intent has ${children.length} child intent(s). Pass force=true to delete with children.`);
  }

  const orphaned = children.map((child) => child.id);
  state.intents = state.intents.filter((intent) => intent.id !== id && !orphaned.includes(intent.id));
  writeState(state);
  return { deleted: id, orphaned };
}

export function validateTaxonomy(): ValidationReport & { recommendations: string[] } {
  const state = readState();
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];

  const allIds = new Set(state.intents.map((intent) => intent.id));
  const names = state.intents.map((intent) => intent.name.toLowerCase());
  const dupNames = names.filter((name, idx) => names.indexOf(name) !== idx);

  state.intents.forEach((intent) => {
    if (!intent.name.trim()) errors.push(`Intent ${intent.id} has empty name.`);
    if (!intent.description.trim()) warnings.push(`Intent "${intent.name}" has no description.`);
    if (intent.examples.length === 0) warnings.push(`Intent "${intent.name}" has no examples.`);
    if (intent.channels.length === 0) errors.push(`Intent "${intent.name}" has no channels defined.`);
    if (!intent.routing.flowId || !intent.routing.queueId) {
      errors.push(`Intent "${intent.name}" is missing routing (flowId or queueId).`);
    }
    if (intent.parentId && !allIds.has(intent.parentId)) {
      errors.push(`Intent "${intent.name}" references missing parent ${intent.parentId}.`);
    }
    if (dupNames.includes(intent.name.toLowerCase())) {
      warnings.push(`Duplicate intent name detected: "${intent.name}".`);
    }
  });

  const hasChannel: Record<string, boolean> = {};
  state.intents.forEach((intent) => {
    intent.channels.forEach((channel) => {
      hasChannel[channel] = true;
    });
  });
  if (!hasChannel['self-service']) {
    recommendations.push('No intents configured for self-service channel — consider adding self-service variants.');
  }
  if (errors.length > 0) {
    recommendations.push('Resolve routing errors before deploying taxonomy to production flows.');
  }
  if (warnings.length > 3) {
    recommendations.push('Enrich intent descriptions and examples to improve intent-matching accuracy.');
  }

  return { warnings, errors, recommendations };
}

export function getRoutingStrategies(): RoutingStrategy[] {
  const state = readState();
  return state.intents.map((intent) => ({
    intentId: intent.id,
    intentName: intent.name,
    flowId: intent.routing.flowId ?? 'flow-main',
    queueId: intent.routing.queueId ?? 'queue-general',
    channel: intent.routing.channel ?? 'voice',
    priority: intent.routing.priority ?? intent.priority,
    sla: intent.sla,
    fallbackQueueId: intent.routing.fallbackQueueId ?? 'queue-general',
    escalationQueueId: intent.routing.escalationQueueId ?? 'queue-supervisor',
  }));
}

export function exportTaxonomy(): ExportPayload {
  const state = readState();
  const validation = validateTaxonomy();
  const strategies = getRoutingStrategies();
  const roots = state.intents.filter((intent) => intent.parentId === null);
  const children = state.intents.filter((intent) => intent.parentId !== null);
  const mappedIntents = state.intents.filter((intent) => intent.routing.flowId && intent.routing.queueId).length;

  return {
    taxonomy: deepClone(state.intents),
    routingStrategies: strategies,
    validation: { warnings: validation.warnings, errors: validation.errors },
    recommendations: validation.recommendations,
    summary: {
      intentCount: state.intents.length,
      rootCount: roots.length,
      subIntentCount: children.length,
      mappedIntents,
      unmappedIntents: state.intents.length - mappedIntents,
    },
  };
}
