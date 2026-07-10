type FlowOption = {
  key?: number | string;
  label?: string;
  queue?: string;
  route?: string;
  target?: string;
};

type FlowNode = {
  id?: string;
  type?: string;
  label?: string;
};

type FlowEdge = {
  source?: string;
  target?: string;
};

export type FlowScript = {
  menu?: string;
  options?: FlowOption[];
  after_hours?: string | null;
  holiday?: string | null;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
};

export type SimulationConfig = {
  concurrency: number;
  arrivalRate: number;
  averageDurationMs: number;
  burstMode: boolean;
  maxInteractions: number;
  randomization: boolean;
};

type TimelineEvent = {
  t: number;
  interactionId: string;
  event: string;
  node: string;
  detail?: string;
};

type QueueTimelinePoint = {
  t: number;
  queue: string;
  depth: number;
};

export type SimulationReport = {
  traffic: {
    totalInteractions: number;
    concurrency: number;
    arrivalRate: number;
    burstMode: boolean;
    randomization: boolean;
    generatedProfiles: Array<{ id: string; profile: string; arrivalMs: number; durationMs: number }>;
  };
  performance: {
    averageRoutingTimeMs: number;
    maxRoutingTimeMs: number;
    queueDepthOverTime: QueueTimelinePoint[];
    nodeHitFrequency: Record<string, number>;
    nodeFailureFrequency: Record<string, number>;
    bottleneckDetection: string[];
    flowComplexityScore: number;
    errorCount: number;
    warningCount: number;
    abandonedInteractions: number;
    successfulCompletions: number;
  };
  routing: {
    pathCounts: Record<string, number>;
    unreachableNodes: string[];
    infiniteLoops: string[];
    deadEnds: string[];
  };
  bottlenecks: string[];
  failures: string[];
  warnings: string[];
  recommendations: string[];
  timeline: TimelineEvent[];
};

type QueueState = {
  nextAvailableAt: number;
  depth: number;
  agents: number;
};

function safeNumber(value: number, fallback: number, min = 1): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.floor(value));
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function detectUnreachableNodes(script: FlowScript): string[] {
  const nodes = Array.isArray(script.nodes) ? script.nodes : [];
  const edges = Array.isArray(script.edges) ? script.edges : [];
  if (nodes.length === 0) return [];

  const incoming = new Map<string, number>();
  for (const node of nodes) {
    if (node.id) incoming.set(node.id, 0);
  }
  for (const edge of edges) {
    if (!edge.target) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  const unreachable: string[] = [];
  for (const node of nodes) {
    const id = node.id;
    if (!id) continue;
    const isMenu = (node.type ?? '').toLowerCase() === 'menu';
    if (!isMenu && (incoming.get(id) ?? 0) === 0) {
      unreachable.push(node.label ?? id);
    }
  }
  return unreachable;
}

function detectInfiniteLoops(script: FlowScript): string[] {
  const nodes = Array.isArray(script.nodes) ? script.nodes : [];
  const edges = Array.isArray(script.edges) ? script.edges : [];
  if (nodes.length === 0 || edges.length === 0) return [];

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const loops = new Set<string>();

  function dfs(nodeId: string) {
    if (visiting.has(nodeId)) {
      loops.add(nodeId);
      return;
    }
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) dfs(next);
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const node of nodes) {
    if (node.id) dfs(node.id);
  }

  return Array.from(loops);
}

function detectDeadEnds(script: FlowScript): string[] {
  const nodes = Array.isArray(script.nodes) ? script.nodes : [];
  const edges = Array.isArray(script.edges) ? script.edges : [];
  if (nodes.length === 0 || edges.length === 0) {
    const options = Array.isArray(script.options) ? script.options : [];
    return options
      .filter((o) => !(o.queue || o.route || o.target || script.after_hours || script.holiday))
      .map((o) => `Option ${o.key ?? '?'}`);
  }

  const outgoing = new Map<string, number>();
  for (const node of nodes) {
    if (node.id) outgoing.set(node.id, 0);
  }
  for (const edge of edges) {
    if (!edge.source) continue;
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
  }

  return nodes
    .filter((n) => n.id && (outgoing.get(n.id) ?? 0) === 0 && (n.type ?? '').toLowerCase() !== 'queue')
    .map((n) => n.label ?? n.id ?? 'unknown');
}

export function runSimulation(script: FlowScript, configInput: Partial<SimulationConfig>): SimulationReport {
  const config: SimulationConfig = {
    concurrency: safeNumber(configInput.concurrency ?? 20, 20),
    arrivalRate: safeNumber(configInput.arrivalRate ?? 5, 5),
    averageDurationMs: safeNumber(configInput.averageDurationMs ?? 120000, 120000, 1000),
    burstMode: !!configInput.burstMode,
    maxInteractions: safeNumber(configInput.maxInteractions ?? 200, 200),
    randomization: configInput.randomization !== false,
  };

  const options = Array.isArray(script.options) ? script.options : [];
  const random = seededRandom(Date.now());
  const timeline: TimelineEvent[] = [];
  const nodeHitFrequency: Record<string, number> = {};
  const nodeFailureFrequency: Record<string, number> = {};
  const pathCounts: Record<string, number> = {};
  const queueDepthOverTime: QueueTimelinePoint[] = [];
  const failures: string[] = [];
  const warnings: string[] = [];

  const queues = new Set<string>();
  for (const option of options) {
    const queue = (option.queue ?? '').trim();
    if (queue) queues.add(queue);
  }
  const queueStates = new Map<string, QueueState>();
  for (const queue of Array.from(queues)) {
    queueStates.set(queue, {
      nextAvailableAt: 0,
      depth: 0,
      agents: Math.max(1, Math.floor(config.concurrency / Math.max(queues.size, 1) / 2)),
    });
  }

  const profiles = ['new-caller', 'repeat-caller', 'vip', 'escalation-prone', 'quick-request'];

  let abandonedInteractions = 0;
  let successfulCompletions = 0;
  let errorCount = 0;
  let warningCount = 0;
  let totalRoutingTime = 0;
  let maxRoutingTime = 0;

  for (let i = 0; i < config.maxInteractions; i += 1) {
    const interactionId = `sim-${i + 1}`;
    const burstMultiplier = config.burstMode && i > config.maxInteractions * 0.6 ? 0.25 : 1;
    const arrivalGap = Math.max(20, Math.round((1000 / config.arrivalRate) * burstMultiplier));
    const arrivalMs = i === 0 ? 0 : i * arrivalGap;
    const durationJitter = config.randomization ? 0.7 + random() * 0.8 : 1;
    const durationMs = Math.round(config.averageDurationMs * durationJitter);
    const profile = profiles[Math.floor((config.randomization ? random() : i / config.maxInteractions) * profiles.length) % profiles.length];

    timeline.push({ t: arrivalMs, interactionId, event: 'interaction_started', node: 'menu', detail: profile });
    nodeHitFrequency.menu = (nodeHitFrequency.menu ?? 0) + 1;

    const interactionOptions = options.length > 0 ? options : [];
    if (interactionOptions.length === 0) {
      failures.push(`Interaction ${interactionId}: no menu options configured.`);
      nodeFailureFrequency.menu = (nodeFailureFrequency.menu ?? 0) + 1;
      errorCount += 1;
      continue;
    }

    const optionIndex = config.randomization
      ? Math.floor(random() * interactionOptions.length)
      : i % interactionOptions.length;
    const selected = interactionOptions[optionIndex];
    const optionLabel = selected.label ?? `Option ${selected.key ?? '?'}`;
    const optionNode = `option:${optionLabel}`;
    nodeHitFrequency[optionNode] = (nodeHitFrequency[optionNode] ?? 0) + 1;
    timeline.push({
      t: arrivalMs + 40,
      interactionId,
      event: 'option_selected',
      node: optionNode,
      detail: `key=${selected.key ?? '?'}`,
    });

    const queue = (selected.queue ?? '').trim();
    const fallback = script.after_hours || script.holiday || null;

    if (!queue && !fallback) {
      failures.push(`Interaction ${interactionId}: dead end at ${optionLabel}.`);
      nodeFailureFrequency[optionNode] = (nodeFailureFrequency[optionNode] ?? 0) + 1;
      errorCount += 1;
      timeline.push({ t: arrivalMs + 60, interactionId, event: 'dead_end', node: optionNode });
      continue;
    }

    let routeNode = '';
    let routeTime = 120;
    if (queue) {
      routeNode = `queue:${queue}`;
      nodeHitFrequency[routeNode] = (nodeHitFrequency[routeNode] ?? 0) + 1;
      const state = queueStates.get(queue) ?? {
        nextAvailableAt: 0,
        depth: 0,
        agents: 1,
      };
      const serviceStart = Math.max(arrivalMs + 120, state.nextAvailableAt);
      const queueWait = Math.max(0, serviceStart - arrivalMs);
      state.depth = Math.max(0, state.depth + 1 - state.agents);
      state.nextAvailableAt = serviceStart + durationMs / state.agents;
      queueStates.set(queue, state);

      queueDepthOverTime.push({ t: arrivalMs, queue, depth: state.depth });
      routeTime += queueWait + Math.round(80 + (config.randomization ? random() * 120 : 60));
      timeline.push({
        t: arrivalMs + routeTime,
        interactionId,
        event: 'routed',
        node: routeNode,
        detail: `queue_wait_ms=${queueWait}`,
      });

      if (queueWait > 45000) {
        abandonedInteractions += 1;
        warningCount += 1;
        warnings.push(`Interaction ${interactionId}: likely abandonment in ${queue} due to high wait.`);
        timeline.push({ t: arrivalMs + routeTime + 1, interactionId, event: 'abandoned', node: routeNode });
      } else {
        successfulCompletions += 1;
        timeline.push({ t: arrivalMs + routeTime + 1, interactionId, event: 'completed', node: routeNode });
      }

      pathCounts[`menu>${optionNode}>${routeNode}`] = (pathCounts[`menu>${optionNode}>${routeNode}`] ?? 0) + 1;
    } else if (script.after_hours) {
      routeNode = `after_hours:${script.after_hours}`;
      nodeHitFrequency.after_hours = (nodeHitFrequency.after_hours ?? 0) + 1;
      routeTime += 90;
      timeline.push({ t: arrivalMs + routeTime, interactionId, event: 'routed', node: routeNode });
      successfulCompletions += 1;
      pathCounts[`menu>${optionNode}>after_hours`] = (pathCounts[`menu>${optionNode}>after_hours`] ?? 0) + 1;
    } else if (script.holiday) {
      routeNode = `holiday:${script.holiday}`;
      nodeHitFrequency.holiday = (nodeHitFrequency.holiday ?? 0) + 1;
      routeTime += 90;
      timeline.push({ t: arrivalMs + routeTime, interactionId, event: 'routed', node: routeNode });
      successfulCompletions += 1;
      pathCounts[`menu>${optionNode}>holiday`] = (pathCounts[`menu>${optionNode}>holiday`] ?? 0) + 1;
    }

    totalRoutingTime += routeTime;
    maxRoutingTime = Math.max(maxRoutingTime, routeTime);
  }

  const unreachableNodes = detectUnreachableNodes(script);
  const infiniteLoops = detectInfiniteLoops(script);
  const deadEnds = detectDeadEnds(script);

  if (unreachableNodes.length > 0) {
    warningCount += unreachableNodes.length;
    warnings.push(...unreachableNodes.map((n) => `Unreachable node detected: ${n}`));
  }
  if (infiniteLoops.length > 0) {
    errorCount += infiniteLoops.length;
    failures.push(...infiniteLoops.map((n) => `Potential infinite loop detected at node ${n}`));
  }
  if (deadEnds.length > 0) {
    errorCount += deadEnds.length;
    failures.push(...deadEnds.map((n) => `Dead end detected: ${n}`));
  }

  const bottlenecks = Array.from(queueStates.entries())
    .filter(([, s]) => s.depth > 5 || s.nextAvailableAt > config.averageDurationMs * 2)
    .map(([queue]) => `Queue bottleneck detected: ${queue}`);

  const complexityScore =
    (options.length * 10) +
    (Array.isArray(script.nodes) ? script.nodes.length * 4 : 0) +
    (Array.isArray(script.edges) ? script.edges.length * 3 : 0) +
    (infiniteLoops.length * 25) +
    (deadEnds.length * 15);

  const recommendations = new Set<string>();
  if (bottlenecks.length > 0) recommendations.add('Rebalance queues or increase agent capacity on bottleneck queues.');
  if (unreachableNodes.length > 0) recommendations.add('Reconnect or remove unreachable nodes to simplify routing.');
  if (infiniteLoops.length > 0) recommendations.add('Break cyclic routing paths with explicit exit conditions.');
  if (deadEnds.length > 0) recommendations.add('Add fallback routes for dead-end nodes.');
  if (abandonedInteractions > 0) recommendations.add('Add callback or overflow routing to reduce abandons.');
  if (!script.after_hours) recommendations.add('Define after-hours routing destination.');
  if (!script.holiday) recommendations.add('Define holiday routing destination.');
  if (recommendations.size === 0) recommendations.add('Flow performance is stable under current load profile.');

  const generatedProfiles = Array.from({ length: config.maxInteractions }).map((_, i) => {
    const profile = profiles[i % profiles.length];
    const arrivalMs = i * Math.max(20, Math.round(1000 / config.arrivalRate));
    return {
      id: `sim-${i + 1}`,
      profile,
      arrivalMs,
      durationMs: config.averageDurationMs,
    };
  });

  return {
    traffic: {
      totalInteractions: config.maxInteractions,
      concurrency: config.concurrency,
      arrivalRate: config.arrivalRate,
      burstMode: config.burstMode,
      randomization: config.randomization,
      generatedProfiles,
    },
    performance: {
      averageRoutingTimeMs: config.maxInteractions > 0 ? Math.round(totalRoutingTime / config.maxInteractions) : 0,
      maxRoutingTimeMs: maxRoutingTime,
      queueDepthOverTime,
      nodeHitFrequency,
      nodeFailureFrequency,
      bottleneckDetection: bottlenecks,
      flowComplexityScore: complexityScore,
      errorCount,
      warningCount,
      abandonedInteractions,
      successfulCompletions,
    },
    routing: {
      pathCounts,
      unreachableNodes,
      infiniteLoops,
      deadEnds,
    },
    bottlenecks,
    failures,
    warnings,
    recommendations: Array.from(recommendations),
    timeline: timeline.sort((a, b) => a.t - b.t),
  };
}
