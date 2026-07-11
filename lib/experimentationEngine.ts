export type ExperimentVariant = {
  id: string;
  name: string;
  flowId?: string;
  message?: string;
};

export type ExperimentDefinition = {
  id: string;
  name: string;
  type: 'ab' | 'multivariate';
  variants: ExperimentVariant[];
  trafficSplit?: number[];
};

export type ExperimentMetrics = {
  csat: number;
  ahtSeconds: number;
  resolutionRate: number;
  dropoffRate: number;
  sentiment: number;
};

export type ExperimentResult = {
  experimentId: string;
  metricsByVariant: Array<{ variantId: string; variantName: string; metrics: ExperimentMetrics }>;
  winner: { variantId: string; reason: string };
  summary: { sampleSize: number; confidence: number };
};

export function createExperiment(input: Omit<ExperimentDefinition, 'id'>): ExperimentDefinition {
  return { ...input, id: `exp-${Date.now()}` };
}

function score(metrics: ExperimentMetrics) {
  return metrics.csat * 0.35 + metrics.resolutionRate * 0.35 + (100 - metrics.dropoffRate) * 0.2 + (100 - metrics.ahtSeconds / 20) * 0.1;
}

export function runExperiment(experiment: ExperimentDefinition): ExperimentResult {
  const metricsByVariant = experiment.variants.map((variant, idx) => {
    const metrics: ExperimentMetrics = {
      csat: 72 + idx * 4,
      ahtSeconds: 540 - idx * 25,
      resolutionRate: 66 + idx * 5,
      dropoffRate: 18 - idx * 2,
      sentiment: 60 + idx * 6,
    };
    return { variantId: variant.id, variantName: variant.name, metrics };
  });

  const ranked = [...metricsByVariant].sort((a, b) => score(b.metrics) - score(a.metrics));
  const winner = ranked[0];
  return {
    experimentId: experiment.id,
    metricsByVariant,
    winner: { variantId: winner.variantId, reason: 'Highest weighted combined score across CSAT, resolution, and drop-off.' },
    summary: { sampleSize: 1200, confidence: 0.91 },
  };
}

export function experimentReport(experiment: ExperimentDefinition) {
  const result = runExperiment(experiment);
  return {
    experiment,
    result,
    recommendations: [
      `Promote winner variant ${result.winner.variantId} to 80% traffic in staged rollout.`,
      'Continue experiment for one additional week to confirm stability by intent segment.',
    ],
  };
}

