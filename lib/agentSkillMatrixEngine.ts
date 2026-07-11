export type AgentSkillProfile = {
  agentId: string;
  agentName: string;
  skills: Array<{ skill: string; proficiency: 1 | 2 | 3 | 4 | 5 }>;
  channels: Array<'voice' | 'chat' | 'email' | 'self-service'>;
};

export type SkillMapping = {
  skill: string;
  intents: string[];
  channels: string[];
  queues: string[];
  flows: string[];
};

export type SkillDemand = {
  intent: string;
  requiredSkill: string;
  requiredAgents: number;
};

export function listSkills(input: { agents: AgentSkillProfile[]; mappings: SkillMapping[] }) {
  const skillSet = new Set<string>();
  input.agents.forEach((a) => a.skills.forEach((s) => skillSet.add(s.skill)));
  return { agents: input.agents, skills: Array.from(skillSet), mappings: input.mappings };
}

export function saveSkills(input: { agents: AgentSkillProfile[]; mappings: SkillMapping[] }) {
  return { saved: true, ...listSkills(input) };
}

export function deleteSkill(input: { agents: AgentSkillProfile[]; mappings: SkillMapping[]; skill: string }) {
  return {
    agents: input.agents.map((a) => ({ ...a, skills: a.skills.filter((s) => s.skill !== input.skill) })),
    mappings: input.mappings.filter((m) => m.skill !== input.skill),
    deletedSkill: input.skill,
  };
}

export function analyzeSkillCoverage(input: { agents: AgentSkillProfile[]; mappings: SkillMapping[]; demand: SkillDemand[] }) {
  const gaps = input.demand.map((d) => {
    const coveredBy = input.agents.filter((a) => a.skills.some((s) => s.skill === d.requiredSkill && s.proficiency >= 3));
    const gap = d.requiredAgents - coveredBy.length;
    return { intent: d.intent, requiredSkill: d.requiredSkill, requiredAgents: d.requiredAgents, coveredAgents: coveredBy.length, gap };
  });
  const recommendations: string[] = [];
  if (gaps.some((g) => g.gap > 0)) recommendations.push('Upskill agents in under-covered skills and rebalance queue staffing.');
  if (gaps.every((g) => g.gap <= 0)) recommendations.push('Skill coverage meets demand; maintain cadence with quarterly recalibration.');
  return {
    agents: input.agents,
    skills: Array.from(new Set(input.agents.flatMap((a) => a.skills.map((s) => s.skill)))),
    mappings: input.mappings,
    gaps,
    recommendations,
    summary: {
      totalAgents: input.agents.length,
      totalSkills: Array.from(new Set(input.agents.flatMap((a) => a.skills.map((s) => s.skill)))).length,
      underCoveredIntents: gaps.filter((g) => g.gap > 0).length,
    },
  };
}

