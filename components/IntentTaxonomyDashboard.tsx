import React, { useState, useCallback } from 'react';

type TaxonomyChannel = 'voice' | 'chat' | 'email' | 'self-service';
type IntentPriority = 'low' | 'medium' | 'high' | 'critical';

type IntentSLA = { targetSeconds: number; escalationSeconds: number };
type RoutingMapping = {
  flowId?: string;
  queueId?: string;
  channel?: TaxonomyChannel;
  priority?: IntentPriority;
  fallbackQueueId?: string;
  escalationQueueId?: string;
};

type IntentNode = {
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

type HierarchyNode = IntentNode & { children: IntentNode[] };
type RoutingStrategy = {
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
type ValidationReport = { warnings: string[]; errors: string[]; recommendations: string[] };
type ExportPayload = {
  taxonomy: IntentNode[];
  routingStrategies: RoutingStrategy[];
  validation: { warnings: string[]; errors: string[] };
  recommendations: string[];
  summary: { intentCount: number; rootCount: number; subIntentCount: number; mappedIntents: number; unmappedIntents: number };
};

const ALL_CHANNELS: TaxonomyChannel[] = ['voice', 'chat', 'email', 'self-service'];
const ALL_PRIORITIES: IntentPriority[] = ['low', 'medium', 'high', 'critical'];
const PRIORITY_COLOR: Record<IntentPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const emptyForm = (): Partial<IntentNode> => ({
  name: '',
  parentId: null,
  description: '',
  examples: [],
  channels: ['voice'],
  priority: 'medium',
  sla: { targetSeconds: 240, escalationSeconds: 600 },
  routing: { flowId: 'flow-main', queueId: 'queue-general', channel: 'voice', priority: 'medium', fallbackQueueId: 'queue-general', escalationQueueId: 'queue-supervisor' },
});

type Tab = 'tree' | 'routing' | 'validation' | 'export';

export default function IntentTaxonomyDashboard() {
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [allIntents, setAllIntents] = useState<IntentNode[]>([]);
  const [strategies, setStrategies] = useState<RoutingStrategy[]>([]);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [exportData, setExportData] = useState<ExportPayload | null>(null);

  const [tab, setTab] = useState<Tab>('tree');
  const [selectedIntent, setSelectedIntent] = useState<IntentNode | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<IntentNode>>(emptyForm());
  const [examplesText, setExamplesText] = useState('');

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/intents/list');
      const data = await r.json() as { hierarchy: HierarchyNode[]; intents: IntentNode[] };
      setHierarchy(data.hierarchy);
      setAllIntents(data.intents);
      const expandAll = new Set<string>();
      data.hierarchy.forEach((n) => expandAll.add(n.id));
      setExpanded(expandAll);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const loadRouting = useCallback(async () => {
    const r = await fetch('/api/intents/routing-strategy');
    const data = await r.json() as { strategies: RoutingStrategy[] };
    setStrategies(data.strategies);
  }, []);

  const loadValidation = useCallback(async () => {
    const r = await fetch('/api/intents/validate');
    const data = await r.json() as ValidationReport;
    setValidation(data);
  }, []);

  const loadExport = useCallback(async () => {
    const r = await fetch('/api/intents/export');
    const data = await r.json() as ExportPayload;
    setExportData(data);
  }, []);

  React.useEffect(() => {
    if (tab === 'routing') void loadRouting();
    else if (tab === 'validation') void loadValidation();
    else if (tab === 'export') void loadExport();
  }, [tab, loadRouting, loadValidation, loadExport]);

  function startNew(parentId?: string | null) {
    setSelectedIntent(null);
    setForm({ ...emptyForm(), parentId: parentId ?? null });
    setExamplesText('');
    setEditMode(true);
  }

  function startEdit(intent: IntentNode) {
    setSelectedIntent(intent);
    setForm(JSON.parse(JSON.stringify(intent)) as Partial<IntentNode>);
    setExamplesText((intent.examples ?? []).join('\n'));
    setEditMode(true);
  }

  async function saveForm() {
    const examples = examplesText.split('\n').map((e) => e.trim()).filter(Boolean);
    const payload = { ...form, id: selectedIntent?.id, examples };
    const r = await fetch('/api/intents/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok) { const d = await r.json() as { error: string }; setStatus(`Error: ${d.error}`); return; }
    setStatus('Intent saved.');
    setEditMode(false);
    setSelectedIntent(null);
    await load();
    if (tab === 'routing') await loadRouting();
    if (tab === 'validation') await loadValidation();
  }

  async function deleteIntent(id: string, name: string) {
    if (!confirm(`Delete intent "${name}"? This will also delete sub-intents.`)) return;
    const r = await fetch('/api/intents/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, force: true }) });
    const d = await r.json() as { deleted?: string; orphaned?: string[]; error?: string };
    if (!r.ok) { setStatus(`Error: ${d.error ?? 'unknown'}`); return; }
    setStatus(`Deleted "${name}" + ${d.orphaned?.length ?? 0} sub-intent(s).`);
    if (selectedIntent?.id === id) { setSelectedIntent(null); setEditMode(false); }
    await load();
  }

  function downloadJson(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tree', label: '🌳 Taxonomy Tree' },
    { key: 'routing', label: '🗺 Routing Designer' },
    { key: 'validation', label: '✅ Validation' },
    { key: 'export', label: '📦 Export' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700">Intent Taxonomy Manager</h1>
          <p className="text-gray-500 mt-1">Define intents, manage hierarchy, and design routing strategies.</p>
        </div>
        <button onClick={() => startNew(null)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          + New Root Intent
        </button>
      </div>

      {status && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">{status}</div>
      )}

      {/* Tab nav */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* EDIT PANEL */}
      {editMode && (
        <div className="border border-indigo-200 rounded-lg p-5 bg-indigo-50 space-y-4">
          <h2 className="text-lg font-semibold text-indigo-800">{selectedIntent ? `Editing: ${selectedIntent.name}` : 'New Intent'}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Billing Dispute" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Intent</label>
              <select value={form.parentId ?? ''} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value || null }))} className="w-full border rounded px-3 py-2 text-sm bg-white">
                <option value="">None (root intent)</option>
                {allIntents.filter((i) => i.id !== selectedIntent?.id).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Examples (one per line)</label>
            <textarea rows={3} value={examplesText} onChange={(e) => setExamplesText(e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="I want to dispute a charge&#10;My bill is wrong" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority ?? 'medium'} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as IntentPriority }))} className="w-full border rounded px-3 py-2 text-sm bg-white">
                {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target SLA (seconds)</label>
              <input type="number" value={form.sla?.targetSeconds ?? 240} onChange={(e) => setForm((f) => ({ ...f, sla: { ...(f.sla ?? { targetSeconds: 240, escalationSeconds: 600 }), targetSeconds: Number(e.target.value) } }))} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Escalation SLA (seconds)</label>
              <input type="number" value={form.sla?.escalationSeconds ?? 600} onChange={(e) => setForm((f) => ({ ...f, sla: { ...(f.sla ?? { targetSeconds: 240, escalationSeconds: 600 }), escalationSeconds: Number(e.target.value) } }))} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channels</label>
            <div className="flex gap-3 flex-wrap">
              {ALL_CHANNELS.map((ch) => (
                <label key={ch} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={(form.channels ?? []).includes(ch)}
                    onChange={(e) => {
                      const prev = form.channels ?? [];
                      setForm((f) => ({ ...f, channels: e.target.checked ? [...prev, ch] : prev.filter((c) => c !== ch) }));
                    }}
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flow ID</label>
              <input value={form.routing?.flowId ?? ''} onChange={(e) => setForm((f) => ({ ...f, routing: { ...(f.routing ?? {}), flowId: e.target.value } }))} className="w-full border rounded px-3 py-2 text-sm" placeholder="flow-billing" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Queue ID</label>
              <input value={form.routing?.queueId ?? ''} onChange={(e) => setForm((f) => ({ ...f, routing: { ...(f.routing ?? {}), queueId: e.target.value } }))} className="w-full border rounded px-3 py-2 text-sm" placeholder="queue-billing" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Routing Channel</label>
              <select value={form.routing?.channel ?? 'voice'} onChange={(e) => setForm((f) => ({ ...f, routing: { ...(f.routing ?? {}), channel: e.target.value as TaxonomyChannel } }))} className="w-full border rounded px-3 py-2 text-sm bg-white">
                {ALL_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fallback Queue</label>
              <input value={form.routing?.fallbackQueueId ?? ''} onChange={(e) => setForm((f) => ({ ...f, routing: { ...(f.routing ?? {}), fallbackQueueId: e.target.value } }))} className="w-full border rounded px-3 py-2 text-sm" placeholder="queue-general" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Queue</label>
              <input value={form.routing?.escalationQueueId ?? ''} onChange={(e) => setForm((f) => ({ ...f, routing: { ...(f.routing ?? {}), escalationQueueId: e.target.value } }))} className="w-full border rounded px-3 py-2 text-sm" placeholder="queue-supervisor" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={saveForm} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">💾 Save Intent</button>
            <button onClick={() => { setEditMode(false); setSelectedIntent(null); }} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* TREE TAB */}
      {tab === 'tree' && !editMode && (
        <div className="space-y-2">
          {loading && <p className="text-gray-400 text-sm">Loading…</p>}
          {hierarchy.length === 0 && !loading && <p className="text-gray-500 text-sm">No intents yet. Click "+ New Root Intent" to begin.</p>}
          {hierarchy.map((root) => (
            <div key={root.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => toggle(root.id)}>
                <span className="text-gray-400 text-sm">{expanded.has(root.id) ? '▼' : '▶'}</span>
                <span className="font-semibold text-gray-800 flex-1">{root.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[root.priority]}`}>{root.priority}</span>
                <span className="text-xs text-gray-500">{root.channels.join(', ')}</span>
                <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => startNew(root.id)} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">+ Sub-intent</button>
                  <button onClick={() => startEdit(root)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Edit</button>
                  <button onClick={() => void deleteIntent(root.id, root.name)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Delete</button>
                </div>
              </div>
              {expanded.has(root.id) && (
                <div className="px-4 pb-3">
                  {/* Attributes summary */}
                  <div className="grid grid-cols-3 gap-3 mt-3 mb-3 text-xs text-gray-600">
                    <div><span className="font-medium">Description:</span> {root.description || <em>None</em>}</div>
                    <div><span className="font-medium">SLA Target:</span> {root.sla.targetSeconds}s / Escalation: {root.sla.escalationSeconds}s</div>
                    <div><span className="font-medium">Routing:</span> Flow: {root.routing.flowId} → Queue: {root.routing.queueId}</div>
                  </div>
                  {root.examples.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Examples:</p>
                      <ul className="flex flex-wrap gap-1">
                        {root.examples.map((ex, i) => (
                          <li key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">{ex}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {root.children.length > 0 && (
                    <div className="pl-4 border-l-2 border-indigo-200 space-y-2">
                      {root.children.map((child) => (
                        <div key={child.id} className="border border-gray-100 rounded bg-white p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-400">↳</span>
                            <span className="font-medium text-gray-700 flex-1">{child.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[child.priority]}`}>{child.priority}</span>
                            <span className="text-xs text-gray-500">{child.channels.join(', ')}</span>
                            <div className="flex gap-1 ml-2">
                              <button onClick={() => startEdit(child)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Edit</button>
                              <button onClick={() => void deleteIntent(child.id, child.name)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Delete</button>
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">{child.description}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Flow: {child.routing.flowId} → Queue: {child.routing.queueId}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ROUTING DESIGNER TAB */}
      {tab === 'routing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Routing Strategy Designer</h2>
            <button onClick={() => void loadRouting()} className="text-xs text-indigo-600 hover:underline">Refresh</button>
          </div>
          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Intent</th>
                  <th className="px-4 py-3 text-left">Flow</th>
                  <th className="px-4 py-3 text-left">Queue</th>
                  <th className="px-4 py-3 text-left">Channel</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Target SLA</th>
                  <th className="px-4 py-3 text-left">Fallback</th>
                  <th className="px-4 py-3 text-left">Escalation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {strategies.map((s) => (
                  <tr key={s.intentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.intentName}</td>
                    <td className="px-4 py-3 text-indigo-700 font-mono text-xs">{s.flowId}</td>
                    <td className="px-4 py-3 text-blue-700 font-mono text-xs">{s.queueId}</td>
                    <td className="px-4 py-3">{s.channel}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[s.priority]}`}>{s.priority}</span></td>
                    <td className="px-4 py-3 text-gray-600">{s.sla.targetSeconds}s</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.fallbackQueueId}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.escalationQueueId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {strategies.length === 0 && <p className="text-center text-gray-400 py-8">No strategies yet. Add intents in the Taxonomy Tree tab.</p>}
          </div>
        </div>
      )}

      {/* VALIDATION TAB */}
      {tab === 'validation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Validation Report</h2>
            <button onClick={() => void loadValidation()} className="text-xs text-indigo-600 hover:underline">Re-validate</button>
          </div>
          {validation ? (
            <div className="space-y-4">
              {validation.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg p-4">
                  <p className="font-semibold text-red-700 mb-2">🚨 Errors ({validation.errors.length})</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="border border-yellow-200 rounded-lg p-4">
                  <p className="font-semibold text-yellow-700 mb-2">⚠️ Warnings ({validation.warnings.length})</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                    {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              {validation.recommendations.length > 0 && (
                <div className="border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-700 mb-2">💡 Recommendations</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                    {validation.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {validation.errors.length === 0 && validation.warnings.length === 0 && (
                <div className="border border-green-200 rounded-lg p-4">
                  <p className="font-semibold text-green-700">✅ Taxonomy is valid with no issues.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Loading validation…</p>
          )}
        </div>
      )}

      {/* EXPORT TAB */}
      {tab === 'export' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Export</h2>
            <button onClick={() => void loadExport()} className="text-xs text-indigo-600 hover:underline">Refresh</button>
          </div>
          {exportData ? (
            <>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(exportData.summary).map(([k, v]) => (
                  <div key={k} className="border rounded p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-700">{v as number}</p>
                    <p className="text-xs text-gray-500 mt-1">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
                  </div>
                ))}
              </div>
              {(exportData.validation.errors.length > 0 || exportData.validation.warnings.length > 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                  ⚠️ {exportData.validation.errors.length} error(s), {exportData.validation.warnings.length} warning(s) — resolve before deploying.
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => downloadJson(exportData.taxonomy, 'intent-taxonomy.json')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                >
                  ⬇ Download intent-taxonomy.json
                </button>
                <button
                  onClick={() => downloadJson(exportData.routingStrategies, 'routing-strategies.json')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                >
                  ⬇ Download routing-strategies.json
                </button>
                <button
                  onClick={() => downloadJson(exportData, 'intent-taxonomy-full-export.json')}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  ⬇ Download full-export.json
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm">Loading export data…</p>
          )}
        </div>
      )}
    </div>
  );
}
