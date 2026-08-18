import type { NextApiRequest, NextApiResponse } from 'next';
import { validateFlow, type ValidationReport } from '@/lib/deploymentEngine';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

type FlowJson = Record<string, unknown>;
type ErrorResponse = { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidationReport | ErrorResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { flow, versionId } = req.body as { flow?: FlowJson; versionId?: string };
  if (!flow && !versionId) return res.status(400).json({ error: 'flow or versionId is required' });

  try {
    const ctx = await requireAi4ccContext(req);
    let definition = flow;

    if (versionId) {
      const { data: version, error } = await ctx.admin
        .from('ai4cc_flow_versions')
        .select('id,definition,ai4cc_flows!inner(tenant_id)')
        .eq('id', versionId)
        .eq('ai4cc_flows.tenant_id', ctx.tenantId)
        .maybeSingle();
      if (error) throw error;
      if (!version) return res.status(404).json({ error: 'Version not found' });
      definition = version.definition as FlowJson;
    }

    const report = validateFlow({ flow: definition as FlowJson });

    if (versionId) {
      const status = report.isValid ? (report.warnings.length ? 'warning' : 'passed') : 'failed';
      const { error: updateError } = await ctx.admin
        .from('ai4cc_flow_versions')
        .update({ validation_status: status, validation_report: report })
        .eq('id', versionId);
      if (updateError) throw updateError;
      await ctx.admin.from('ai4cc_audit_logs').insert({
        tenant_id: ctx.tenantId,
        actor_user_id: ctx.userId,
        action: 'flow.validated',
        resource_type: 'flow_version',
        resource_id: versionId,
        payload: { status, errors: report.errors.length, warnings: report.warnings.length },
      });
    }

    return res.status(200).json(report);
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
