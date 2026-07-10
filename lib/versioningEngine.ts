import fs from 'fs';
import path from 'path';

export type FlowJson = Record<string, unknown>;

export type VersionRecord = {
  id: string;
  versionNumber: number;
  timestamp: string;
  user: string;
  notes: string;
  branch: string;
  parentId: string | null;
  flow: FlowJson;
  diffSummary: {
    addedKeys: string[];
    removedKeys: string[];
    changedKeys: string[];
  };
};

export type BranchRecord = {
  name: string;
  headVersionId: string | null;
  baseVersionId: string | null;
  createdAt: string;
  createdFromBranch: string | null;
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  type: 'version_created' | 'rollback' | 'branch_created' | 'branch_switched' | 'merge';
  message: string;
  metadata?: Record<string, unknown>;
};

export type DiffReport = {
  fromVersionId: string;
  toVersionId: string;
  structuralDiff: Array<{ key: string; action: 'add' | 'remove' | 'update'; before: unknown; after: unknown }>;
  logicDiff: string[];
  routingDiff: string[];
  recommendations: string[];
  summary: {
    added: number;
    removed: number;
    changed: number;
  };
};

export type MergeReport = {
  status: 'merged' | 'merged_with_conflicts';
  sourceBranch: string;
  targetBranch: string;
  mergedVersionId: string;
  autoMergedKeys: string[];
  conflicts: Array<{ key: string; sourceValue: unknown; targetValue: unknown }>;
  recommendations: string[];
};

type VersioningState = {
  versions: VersionRecord[];
  branches: Record<string, BranchRecord>;
  currentVersionId: string | null;
  currentBranch: string;
  auditLog: AuditEvent[];
};

const STORE_PATH = path.join(process.cwd(), '.ai4-flow-versioning-store.json');

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultState(): VersioningState {
  return {
    versions: [],
    branches: {
      main: {
        name: 'main',
        headVersionId: null,
        baseVersionId: null,
        createdAt: nowIso(),
        createdFromBranch: null,
      },
    },
    currentVersionId: null,
    currentBranch: 'main',
    auditLog: [],
  };
}

function readState(): VersioningState {
  if (!fs.existsSync(STORE_PATH)) return defaultState();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as VersioningState;
    if (!parsed || !Array.isArray(parsed.versions) || !parsed.branches) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

function writeState(state: VersioningState) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function getVersionById(state: VersioningState, versionId: string): VersionRecord | null {
  return state.versions.find((v) => v.id === versionId) ?? null;
}

function getCurrentVersion(state: VersioningState): VersionRecord | null {
  if (!state.currentVersionId) return null;
  return getVersionById(state, state.currentVersionId);
}

function summarizeDiff(before: FlowJson | null, after: FlowJson): VersionRecord['diffSummary'] {
  if (!before) {
    return {
      addedKeys: Object.keys(after).sort(),
      removedKeys: [],
      changedKeys: [],
    };
  }

  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
  const allKeys = Array.from(new Set([...Array.from(beforeKeys), ...Array.from(afterKeys)])).sort();

  const addedKeys: string[] = [];
  const removedKeys: string[] = [];
  const changedKeys: string[] = [];

  for (const key of allKeys) {
    const beforeHas = beforeKeys.has(key);
    const afterHas = afterKeys.has(key);
    if (!beforeHas && afterHas) {
      addedKeys.push(key);
      continue;
    }
    if (beforeHas && !afterHas) {
      removedKeys.push(key);
      continue;
    }
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedKeys.push(key);
    }
  }

  return { addedKeys, removedKeys, changedKeys };
}

function addAuditEvent(state: VersioningState, event: Omit<AuditEvent, 'id' | 'timestamp'>) {
  state.auditLog.unshift({
    id: makeId('audit'),
    timestamp: nowIso(),
    ...event,
  });
}

export function saveVersion(params: {
  flow: FlowJson;
  user?: string;
  notes?: string;
  branch?: string;
}): VersionRecord {
  const state = readState();
  const branchName = params.branch ?? state.currentBranch;
  if (!state.branches[branchName]) {
    state.branches[branchName] = {
      name: branchName,
      headVersionId: state.currentVersionId,
      baseVersionId: state.currentVersionId,
      createdAt: nowIso(),
      createdFromBranch: state.currentBranch,
    };
  }

  state.currentBranch = branchName;
  const headVersionId = state.branches[branchName].headVersionId;
  const parentVersion = headVersionId ? getVersionById(state, headVersionId) : getCurrentVersion(state);
  const flow = deepClone(params.flow);

  const nextVersion: VersionRecord = {
    id: makeId('ver'),
    versionNumber: state.versions.length + 1,
    timestamp: nowIso(),
    user: params.user?.trim() || 'system',
    notes: params.notes?.trim() || 'No notes',
    branch: branchName,
    parentId: parentVersion?.id ?? null,
    flow,
    diffSummary: summarizeDiff(parentVersion?.flow ?? null, flow),
  };

  state.versions.push(nextVersion);
  state.currentVersionId = nextVersion.id;
  state.branches[branchName].headVersionId = nextVersion.id;
  if (!state.branches[branchName].baseVersionId) state.branches[branchName].baseVersionId = nextVersion.id;

  addAuditEvent(state, {
    type: 'version_created',
    message: `Version v${nextVersion.versionNumber} created on ${branchName}`,
    metadata: { versionId: nextVersion.id, branch: branchName, notes: nextVersion.notes },
  });

  writeState(state);
  return deepClone(nextVersion);
}

export function listVersions() {
  const state = readState();
  const versions = [...state.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const branches = Object.values(state.branches);
  return {
    versions: deepClone(versions),
    branches: deepClone(branches),
    auditLog: deepClone(state.auditLog),
    currentVersionId: state.currentVersionId,
    currentBranch: state.currentBranch,
  };
}

export function diffVersions(fromVersionId: string, toVersionId: string): DiffReport {
  const state = readState();
  const from = getVersionById(state, fromVersionId);
  const to = getVersionById(state, toVersionId);
  if (!from || !to) throw new Error('Invalid version IDs for diff');

  const fromKeys = new Set(Object.keys(from.flow));
  const toKeys = new Set(Object.keys(to.flow));
  const allKeys = Array.from(new Set([...Array.from(fromKeys), ...Array.from(toKeys)])).sort();

  const structuralDiff: DiffReport['structuralDiff'] = [];
  let added = 0;
  let removed = 0;
  let changed = 0;

  for (const key of allKeys) {
    const before = from.flow[key];
    const after = to.flow[key];
    if (!fromKeys.has(key)) {
      added += 1;
      structuralDiff.push({ key, action: 'add', before: undefined, after });
      continue;
    }
    if (!toKeys.has(key)) {
      removed += 1;
      structuralDiff.push({ key, action: 'remove', before, after: undefined });
      continue;
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed += 1;
      structuralDiff.push({ key, action: 'update', before, after });
    }
  }

  const logicDiff: string[] = [];
  const routingDiff: string[] = [];
  const recommendations: string[] = [];

  const fromOptions = (from.flow.options as unknown[] | undefined) ?? [];
  const toOptions = (to.flow.options as unknown[] | undefined) ?? [];
  if (toOptions.length !== fromOptions.length) {
    logicDiff.push(`Options count changed: ${fromOptions.length} → ${toOptions.length}`);
  }

  if (JSON.stringify(from.flow.after_hours) !== JSON.stringify(to.flow.after_hours)) {
    routingDiff.push('After-hours routing changed.');
  }
  if (JSON.stringify(from.flow.holiday) !== JSON.stringify(to.flow.holiday)) {
    routingDiff.push('Holiday routing changed.');
  }

  if (changed > 8) recommendations.push('Large change set detected — run simulation before deployment.');
  if (routingDiff.length > 0) recommendations.push('Validate routing updates against business hours and SLA policies.');
  if (logicDiff.length > 0) recommendations.push('Review menu prompt updates for caller clarity.');

  return {
    fromVersionId,
    toVersionId,
    structuralDiff,
    logicDiff,
    routingDiff,
    recommendations,
    summary: { added, removed, changed },
  };
}

export function rollbackVersion(versionId: string) {
  const state = readState();
  const version = getVersionById(state, versionId);
  if (!version) throw new Error('Version not found');

  state.currentVersionId = version.id;
  state.currentBranch = version.branch;
  if (state.branches[version.branch]) state.branches[version.branch].headVersionId = version.id;

  addAuditEvent(state, {
    type: 'rollback',
    message: `Rolled back to v${version.versionNumber} (${version.id})`,
    metadata: { versionId: version.id, branch: version.branch },
  });

  writeState(state);
  return {
    ok: true,
    versionId: version.id,
    branch: version.branch,
    versionNumber: version.versionNumber,
  };
}

export function createBranch(name: string, fromVersionId?: string) {
  const state = readState();
  const branchName = name.trim();
  if (!branchName) throw new Error('Branch name is required');
  if (state.branches[branchName]) throw new Error('Branch already exists');

  const sourceVersionId = fromVersionId ?? state.currentVersionId;
  state.branches[branchName] = {
    name: branchName,
    headVersionId: sourceVersionId ?? null,
    baseVersionId: sourceVersionId ?? null,
    createdAt: nowIso(),
    createdFromBranch: state.currentBranch,
  };

  addAuditEvent(state, {
    type: 'branch_created',
    message: `Branch ${branchName} created`,
    metadata: { branch: branchName, fromVersionId: sourceVersionId ?? null },
  });

  writeState(state);
  return deepClone(state.branches[branchName]);
}

export function switchBranch(name: string) {
  const state = readState();
  const branch = state.branches[name];
  if (!branch) throw new Error('Branch not found');
  state.currentBranch = name;
  state.currentVersionId = branch.headVersionId;

  addAuditEvent(state, {
    type: 'branch_switched',
    message: `Switched to branch ${name}`,
    metadata: { branch: name, headVersionId: branch.headVersionId },
  });

  writeState(state);
  return { ok: true, currentBranch: state.currentBranch, currentVersionId: state.currentVersionId };
}

export function mergeBranch(sourceBranch: string, targetBranch = 'main'): MergeReport {
  const state = readState();
  const source = state.branches[sourceBranch];
  const target = state.branches[targetBranch];
  if (!source || !target) throw new Error('Invalid source or target branch');
  if (!source.headVersionId) throw new Error('Source branch has no head version');
  if (!target.headVersionId) throw new Error('Target branch has no head version');

  const sourceHead = getVersionById(state, source.headVersionId);
  const targetHead = getVersionById(state, target.headVersionId);
  if (!sourceHead || !targetHead) throw new Error('Branch head version not found');

  const baseVersion = source.baseVersionId ? getVersionById(state, source.baseVersionId) : targetHead;
  const baseFlow = baseVersion?.flow ?? {};
  const sourceFlow = sourceHead.flow;
  const targetFlow = targetHead.flow;

  const mergedFlow: FlowJson = deepClone(targetFlow);
  const autoMergedKeys: string[] = [];
  const conflicts: MergeReport['conflicts'] = [];
  const allKeys = Array.from(new Set([...Object.keys(baseFlow), ...Object.keys(sourceFlow), ...Object.keys(targetFlow)])).sort();

  for (const key of allKeys) {
    const b = baseFlow[key];
    const s = sourceFlow[key];
    const t = targetFlow[key];
    const bStr = JSON.stringify(b);
    const sStr = JSON.stringify(s);
    const tStr = JSON.stringify(t);

    if (sStr === tStr) {
      mergedFlow[key] = deepClone(s);
      continue;
    }
    if (bStr === tStr) {
      mergedFlow[key] = deepClone(s);
      autoMergedKeys.push(key);
      continue;
    }
    if (bStr === sStr) {
      mergedFlow[key] = deepClone(t);
      autoMergedKeys.push(key);
      continue;
    }
    conflicts.push({ key, sourceValue: deepClone(s), targetValue: deepClone(t) });
    mergedFlow[key] = deepClone(t);
  }

  // manual inline save to avoid race with separate read/write
  const mergedVersion: VersionRecord = {
    id: makeId('ver'),
    versionNumber: state.versions.length + 1,
    timestamp: nowIso(),
    user: 'merge-bot',
    notes: `Merge ${sourceBranch} -> ${targetBranch}`,
    branch: targetBranch,
    parentId: targetHead.id,
    flow: deepClone(mergedFlow),
    diffSummary: summarizeDiff(targetHead.flow, mergedFlow),
  };
  state.versions.push(mergedVersion);
  state.currentBranch = targetBranch;
  state.currentVersionId = mergedVersion.id;
  state.branches[targetBranch].headVersionId = mergedVersion.id;

  const status: MergeReport['status'] = conflicts.length > 0 ? 'merged_with_conflicts' : 'merged';
  const recommendations: string[] = [];
  if (conflicts.length > 0) recommendations.push('Resolve merge conflicts manually and re-run merge.');
  if (autoMergedKeys.length > 0) recommendations.push('Validate auto-merged keys with flow simulation before deployment.');

  addAuditEvent(state, {
    type: 'merge',
    message: `Merged ${sourceBranch} into ${targetBranch} (${status})`,
    metadata: {
      sourceBranch,
      targetBranch,
      mergedVersionId: mergedVersion.id,
      conflictCount: conflicts.length,
    },
  });

  writeState(state);
  return {
    status,
    sourceBranch,
    targetBranch,
    mergedVersionId: mergedVersion.id,
    autoMergedKeys,
    conflicts,
    recommendations,
  };
}

