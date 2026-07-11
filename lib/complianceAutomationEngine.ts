export type ComplianceRule = {
  id: string;
  name: string;
  target: 'flow' | 'transcript' | 'kb' | 'routing' | 'agent';
  pattern: string;
  severity: 'low' | 'medium' | 'high';
};

export type ComplianceAsset = {
  id: string;
  type: 'flow' | 'transcript' | 'kb' | 'routing' | 'agent';
  content: string;
};

export type ComplianceScanInput = {
  rules: ComplianceRule[];
  assets: ComplianceAsset[];
};

export type ComplianceViolation = {
  ruleId: string;
  assetId: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
};

export function listDefaultRules(): ComplianceRule[] {
  return [
    { id: 'rule-pci', name: 'No full card numbers', target: 'transcript', pattern: 'credit card number', severity: 'high' },
    { id: 'rule-verify', name: 'Verification required', target: 'agent', pattern: 'verify', severity: 'medium' },
    { id: 'rule-pii', name: 'No SSN in KB', target: 'kb', pattern: 'ssn', severity: 'high' },
  ];
}

export function runComplianceScan(input: ComplianceScanInput): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  input.assets.forEach((asset) => {
    const lower = asset.content.toLowerCase();
    input.rules
      .filter((r) => r.target === asset.type || r.target === 'agent')
      .forEach((rule) => {
        if (lower.includes(rule.pattern.toLowerCase())) {
          violations.push({
            ruleId: rule.id,
            assetId: asset.id,
            severity: rule.severity,
            message: `${rule.name} matched pattern "${rule.pattern}" on ${asset.type} asset ${asset.id}.`,
          });
        }
      });
  });
  return violations;
}

export function complianceReport(input: ComplianceScanInput) {
  const violations = runComplianceScan(input);
  const recommendations: string[] = [];
  if (violations.some((v) => v.severity === 'high')) recommendations.push('Block deployment until high-severity violations are remediated.');
  if (violations.length > 0) recommendations.push('Assign remediation owners and SLA deadlines for each violation.');
  if (recommendations.length === 0) recommendations.push('No violations detected; continue scheduled compliance scans.');
  return {
    rules: input.rules,
    violations,
    recommendations,
    summary: {
      totalRules: input.rules.length,
      scannedAssets: input.assets.length,
      violations: violations.length,
      highSeverity: violations.filter((v) => v.severity === 'high').length,
    },
  };
}

