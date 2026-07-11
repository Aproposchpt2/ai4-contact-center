export type CostInput = {
  interactionsPerMonth: number;
  channelMix: Array<{ channel: 'voice' | 'chat' | 'email' | 'self-service'; volumePct: number; costPerInteraction: number }>;
  automationRate: number;
  agentHourlyCost: number;
  avgHandleTimeMinutes: number;
};

export type CostReport = {
  costBreakdown: Array<{ channel: string; monthlyCost: number }>;
  totalMonthlyCost: number;
  projectedSavings: number;
  roiProjectionPct: number;
  recommendations: string[];
};

export function analyzeCost(input: CostInput) {
  const costBreakdown = input.channelMix.map((c) => {
    const interactions = input.interactionsPerMonth * (c.volumePct / 100);
    return { channel: c.channel, monthlyCost: Number((interactions * c.costPerInteraction).toFixed(2)) };
  });
  const totalMonthlyCost = Number(costBreakdown.reduce((sum, c) => sum + c.monthlyCost, 0).toFixed(2));
  return { costBreakdown, totalMonthlyCost };
}

export function projectROI(input: CostInput) {
  const { totalMonthlyCost } = analyzeCost(input);
  const projectedSavings = Number((totalMonthlyCost * (input.automationRate / 100) * 0.35).toFixed(2));
  const investment = Math.max(1, totalMonthlyCost * 0.15);
  const roiProjectionPct = Number((((projectedSavings - investment) / investment) * 100).toFixed(2));
  return { projectedSavings, roiProjectionPct };
}

export function recommendCostActions(input: CostInput) {
  const recs: string[] = [];
  if (input.automationRate < 40) recs.push('Increase self-service containment for top repetitive intents.');
  const voiceShare = input.channelMix.find((c) => c.channel === 'voice')?.volumePct ?? 0;
  if (voiceShare > 55) recs.push('Shift low-complexity voice intents into digital channels.');
  if (input.avgHandleTimeMinutes > 9) recs.push('Reduce AHT with guided workflows and response templates.');
  if (recs.length === 0) recs.push('Current operating cost profile is efficient; monitor monthly variance.');
  return recs;
}

export function generateCostReport(input: CostInput): CostReport {
  const cost = analyzeCost(input);
  const roi = projectROI(input);
  return {
    costBreakdown: cost.costBreakdown,
    totalMonthlyCost: cost.totalMonthlyCost,
    projectedSavings: roi.projectedSavings,
    roiProjectionPct: roi.roiProjectionPct,
    recommendations: recommendCostActions(input),
  };
}

