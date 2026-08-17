import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type Flow = {
  id: string;
  name: string;
  text_input: string;
  parsed_output: object;
  engine: 'ai' | 'rules';
  status: string;
  version: number;
  created_at: string;
};

type SuccessResponse = {
  tenant: { id: string; name: string; role: string };
  flows: Flow[];
};

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: 'Canonical Supabase storage is not configured' });
  }

  const accessToken = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  const user = userData.user;
  if (userError || !user) return res.status(401).json({ error: 'Not authenticated' });

  const { data: membership, error: membershipError } = await admin
    .from('ai4cc_tenant_members')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) return res.status(500).json({ error: membershipError.message });
  if (!membership) return res.status(403).json({ error: 'No AI4 Contact Center tenant membership found' });

  const tenantId = membership.tenant_id as string;
  const { data: tenant, error: tenantError } = await admin
    .from('ai4cc_tenants')
    .select('id, name')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    return res.status(500).json({ error: tenantError?.message ?? 'Tenant not found' });
  }

  const { data: flowRows, error: flowError } = await admin
    .from('ai4cc_flows')
    .select('id, name, source_text, status, current_version, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (flowError) return res.status(500).json({ error: flowError.message });

  const rows = flowRows ?? [];
  if (rows.length === 0) {
    return res.status(200).json({
      tenant: { id: tenant.id, name: tenant.name, role: membership.role },
      flows: [],
    });
  }

  const flowIds = rows.map((flow) => flow.id);
  const { data: versions, error: versionError } = await admin
    .from('ai4cc_flow_versions')
    .select('flow_id, version, definition, parser_engine')
    .in('flow_id', flowIds);

  if (versionError) return res.status(500).json({ error: versionError.message });

  const versionMap = new Map<string, { definition: object; parser_engine: string }>();
  for (const version of versions ?? []) {
    const flow = rows.find((row) => row.id === version.flow_id);
    if (flow && flow.current_version === version.version) {
      versionMap.set(version.flow_id, {
        definition: version.definition as object,
        parser_engine: version.parser_engine,
      });
    }
  }

  const flows: Flow[] = rows.map((flow) => {
    const version = versionMap.get(flow.id);
    return {
      id: flow.id,
      name: flow.name,
      text_input: flow.source_text ?? '',
      parsed_output: version?.definition ?? {},
      engine: version?.parser_engine === 'ai' ? 'ai' : 'rules',
      status: flow.status,
      version: flow.current_version,
      created_at: flow.created_at,
    };
  });

  return res.status(200).json({
    tenant: { id: tenant.id, name: tenant.name, role: membership.role },
    flows,
  });
}
