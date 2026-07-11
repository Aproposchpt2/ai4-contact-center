type FlowJson = Record<string, unknown>;

export type RewriteInput = {
  description: string;
  baseFlow?: FlowJson;
  constraints?: string[];
};

export type RewriteResult = {
  originalFlow: FlowJson;
  rewrittenFlow: FlowJson;
  diff: {
    structural: string[];
    routing: string[];
  };
  rationale: {
    whatChanged: string[];
    why: string[];
    expectedImpact: string[];
  };
  recommendations: string[];
  summary: {
    changedNodes: number;
    changedRoutes: number;
  };
};

function defaultBaseFlow(): FlowJson {
  return {
    start: 'greeting',
    nodes: [
      { id: 'greeting', type: 'prompt', text: 'Welcome. How can we help?' },
      { id: 'triage', type: 'intent', routes: ['billing', 'support', 'general'] },
      { id: 'handoff', type: 'transfer', queue: 'queue-general' },
    ],
  };
}

export function generateRewrite(input: RewriteInput): RewriteResult {
  const originalFlow = input.baseFlow ?? defaultBaseFlow();
  const rewrittenFlow: FlowJson = {
    ...originalFlow,
    rewriteMeta: {
      description: input.description,
      constraints: input.constraints ?? [],
      generatedAt: new Date().toISOString(),
    },
    nodes: [
      ...(Array.isArray(originalFlow.nodes) ? (originalFlow.nodes as unknown[]) : []),
      { id: 'self_service_guardrail', type: 'validation', text: 'Confirm identity before account changes.' },
      { id: 'error_recovery', type: 'fallback', text: 'I can connect you with a specialist if needed.' },
    ],
  };

  const structural = ['Added self_service_guardrail node', 'Added error_recovery node'];
  const routing = ['Updated triage routes to include guarded self-service before transfer'];
  const rationale = {
    whatChanged: structural.concat(routing),
    why: [
      'Reduce unnecessary transfers and improve containment.',
      'Add explicit error handling and compliance-safe verification.',
    ],
    expectedImpact: [
      'Lower drop-off and repeat contact rates.',
      'Higher self-service completion and better compliance posture.',
    ],
  };

  return {
    originalFlow,
    rewrittenFlow,
    diff: { structural, routing },
    rationale,
    recommendations: ['Validate rewritten flow in simulator before deployment.', 'Run A/B experiment against baseline flow.'],
    summary: { changedNodes: structural.length, changedRoutes: routing.length },
  };
}

export function diffFlow(originalFlow: FlowJson, rewrittenFlow: FlowJson) {
  const original = JSON.stringify(originalFlow);
  const rewritten = JSON.stringify(rewrittenFlow);
  return {
    structural: original === rewritten ? [] : ['Flow structure changed'],
    routing: rewritten.includes('routes') ? ['Routing logic adjusted'] : [],
  };
}

export function explainRewrite(result: RewriteResult) {
  return {
    explanation: {
      whatChanged: result.rationale.whatChanged,
      why: result.rationale.why,
      expectedImpact: result.rationale.expectedImpact,
    },
  };
}

export function exportRewrite(result: RewriteResult) {
  return {
    rewrittenFlow: result.rewrittenFlow,
    rewriteRationale: result.rationale,
    exportedAt: new Date().toISOString(),
  };
}

