import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

type FlowJson = Record<string, unknown>;
type ErrorResponse = { error: string };

function buildDiff(fromVersionId: string, toVersionId: string, before: FlowJson, after: FlowJson) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  const structuralDiff: Array<{ key: string; action: 'add'|'remove'|'update'; before: unknown; after: unknown }> = [];
  let added = 0, removed = 0, changed = 0;
  for (const key of keys) {
    const beforeHas = Object.prototype.hasOwnProperty.call(before, key);
    const afterHas = Object.prototype.hasOwnProperty.call(after, key);
    if (!beforeHas && afterHas) { added++; structuralDiff.push({ key, action: 'add', before: undefined, after: after[key] }); }
    else if (beforeHas && !afterHas) { removed++; structuralDiff.push({ key, action: 'remove', before: before[key], after: undefined }); }
    else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) { changed++; structuralDiff.push({ key, action: 'update', before: before[key], after: after[key] }); }
  }
  const logicDiff: string[] = [];
  const routingDiff: string[] = [];
  const recommendations: string[] = [];
  const beforeOptions = Array.isArray(before.options) ? before.options : [];
  const afterOptions = Array.isArray(after.options) ? after.options : [];
  if (beforeOptions.length !== afterOptions.length) logicDiff.push(`Options count changed: ${beforeOptions.length} → ${afterOptions.length}`);
  if (JSON.stringify(before.after_hours) !== JSON.stringify(after.after_hours)) routingDiff.push('After-hours routing changed.');
  if (JSON.stringify(before.holiday) !== JSON.stringify(after.holiday)) routingDiff.push('Holiday routing changed.');
  if (changed > 8) recommendations.push('Large change set detected — run simulation before deployment.');
  if (routingDiff.length) recommendations.push('Validate routing changes before deployment.');
  return { fromVersionId, toVersionId, structuralDiff, logicDiff, routingDiff, recommendations, summary: { added, removed, changed } };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { fromVersionId, toVersionId } = req.body as { fromVersionId?: string; toVersionId?: string };
  if (!fromVersionId || !toVersionId) return res.status(400).json({ error: 'fromVersionId and toVersionId are required' });

  try {
    const ctx = await requireAi4ccContext(req);
    const { data, error } = await ctx.admin
      .from('ai4cc_flow_versions')
      .select('id,flow_id,definition,ai4cc_flows!inner(tenant_id)')
      .in('id', [fromVersionId, toVersionId])
      .eq('ai4cc_flows.tenant_id', ctx.tenantId);
    if (error) throw error;
    if (!data || data.length !== 2) return res.status(404).json({ error: 'One or both versions were not found' });
    const from = data.find((v: any) => v.id === fromVersionId);
    const to = data.find((v: any) => v.id === toVersionId);
    if (!from || !to) return res.status(404).json({ error: 'One or both versions were not found' });
    if (from.flow_id !== to.flow_id) return res.status(400).json({ error: 'Versions must belong to the same flow' });
    return res.status(200).json(buildDiff(fromVersionId, toVersionId, from.definition as FlowJson, to.definition as FlowJson));
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
