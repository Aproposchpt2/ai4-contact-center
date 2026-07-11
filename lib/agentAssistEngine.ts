export type AssistTurn = {
  speaker: 'agent' | 'customer';
  text: string;
  timestamp: string;
};

export type AssistSession = {
  sessionId: string;
  flowId?: string;
  turns: AssistTurn[];
  channel: 'voice' | 'chat' | 'email';
  agentId?: string;
};

export type AssistGuidance = {
  detectedIntent: string;
  suggestedReplies: string[];
  kbGrounding: Array<{ articleId: string; title: string; snippet: string }>;
  complianceAlerts: string[];
  nextBestActions: string[];
  mappedFlowNode: string;
  state: {
    sentiment: 'negative' | 'neutral' | 'positive';
    escalationRisk: 'low' | 'medium' | 'high';
  };
};

export function ingestAssistSession(input: AssistSession) {
  return {
    sessionId: input.sessionId,
    turnCount: input.turns.length,
    lastTurn: input.turns[input.turns.length - 1] ?? null,
  };
}

export function getKBGrounding(session: AssistSession) {
  const merged = session.turns.map((t) => t.text.toLowerCase()).join(' ');
  const hits = [
    { articleId: 'kb-001', title: 'Billing dispute policy', snippet: 'Agents must verify account before issuing credits.' },
    { articleId: 'kb-002', title: 'Escalation playbook', snippet: 'Offer callback window and provide ticket reference.' },
    { articleId: 'kb-003', title: 'Password reset SOP', snippet: 'Use two-factor verification prior to reset.' },
  ];
  if (merged.includes('billing')) return hits.slice(0, 2);
  if (merged.includes('password')) return [hits[2]];
  return [hits[1]];
}

export function getComplianceAlerts(session: AssistSession) {
  const transcript = session.turns.map((t) => t.text.toLowerCase()).join(' ');
  const alerts: string[] = [];
  if (transcript.includes('credit card number')) alerts.push('Do not collect full credit card number in plain text.');
  if (!transcript.includes('verify')) alerts.push('Verification phrase not detected. Confirm customer identity.');
  return alerts;
}

export function generateGuidance(session: AssistSession): AssistGuidance {
  const merged = session.turns.map((t) => t.text.toLowerCase()).join(' ');
  const detectedIntent = merged.includes('cancel')
    ? 'cancellation'
    : merged.includes('billing')
      ? 'billing_support'
      : merged.includes('password')
        ? 'password_reset'
        : 'general_inquiry';
  const sentiment: AssistGuidance['state']['sentiment'] = merged.includes('frustrated') || merged.includes('angry') ? 'negative' : merged.includes('thanks') ? 'positive' : 'neutral';
  const escalationRisk: AssistGuidance['state']['escalationRisk'] = sentiment === 'negative' ? 'high' : detectedIntent === 'billing_support' ? 'medium' : 'low';

  return {
    detectedIntent,
    suggestedReplies: [
      'I understand the issue and I can help resolve this now.',
      'Let me verify your account and check the best available option.',
      'I can provide a clear next step and timeline before we close this chat.',
    ],
    kbGrounding: getKBGrounding(session),
    complianceAlerts: getComplianceAlerts(session),
    nextBestActions: escalationRisk === 'high'
      ? ['Offer supervisor callback option', 'Create priority ticket with full context']
      : ['Complete verification', 'Route to the mapped flow node'],
    mappedFlowNode: detectedIntent === 'billing_support' ? 'node-billing-triage' : detectedIntent === 'password_reset' ? 'node-auth-reset' : 'node-general-support',
    state: { sentiment, escalationRisk },
  };
}

export function getAssistState(session: AssistSession) {
  const guidance = generateGuidance(session);
  return {
    sessionId: session.sessionId,
    flowId: session.flowId ?? 'flow-main',
    agentId: session.agentId ?? 'agent-unknown',
    intent: guidance.detectedIntent,
    mappedFlowNode: guidance.mappedFlowNode,
    escalationRisk: guidance.state.escalationRisk,
    complianceAlertCount: guidance.complianceAlerts.length,
    timestamp: new Date().toISOString(),
  };
}

