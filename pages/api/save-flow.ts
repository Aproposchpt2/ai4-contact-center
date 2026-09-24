import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveMembership, apiErrorStatus, apiErrorMessage } from '@/lib/ai4ccServer';
import { createClient } from '@supabase/supabase-js';

type Body = {
  name?: string;
  text: string;
  parsed: object;
  engine?: 'ai' | 'rules' | string;
};

type Result =
  | { ok: true; id: string; versionId: string; version: number; tenantId: string }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Result>
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { name, text, parsed, engine } = req.body as Body;
  if (!text?.trim() || !parsed) {
    return res.status(400).json({ error: 'text and parsed are required' });
  }

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

  let membership: { tenant_id: string; role: string };
  try {
    const m = await resolveMembership(admin, user.id, req);
    membership = { tenant_id: m.tenantId, role: m.role };
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }

  const tenantId = membership.tenant_id as string;
  const flowName = name?.trim() || 'Untitled Flow';

  const { data: flow, error: flowError } = await admin
    .from('ai4cc_flows')
    .insert({
      tenant_id: tenantId,
      name: flowName,
      source_text: text.trim(),
      channel: 'voice',
      status: 'draft',
      current_version: 1,
      created_by: user.id,
    })
    .select('id, current_version')
    .single();

  if (flowError || !flow) {
    return res.status(500).json({ error: flowError?.message ?? 'Unable to create flow' });
  }

  const { data: version, error: versionError } = await admin
    .from('ai4cc_flow_versions')
    .insert({
      flow_id: flow.id,
      version: flow.current_version,
      definition: parsed,
      parser_engine: engine === 'ai' ? 'ai' : 'rules',
      validation_status: 'pending',
      created_by: user.id,
    })
    .select('id, version')
    .single();

  if (versionError || !version) {
    await admin.from('ai4cc_flows').delete().eq('id', flow.id);
    return res.status(500).json({ error: versionError?.message ?? 'Unable to create flow version' });
  }

  await admin.from('ai4cc_audit_logs').insert({
    tenant_id: tenantId,
    actor_user_id: user.id,
    action: 'flow.created',
    resource_type: 'flow',
    resource_id: flow.id,
    payload: { name: flowName, version: version.version, parser_engine: engine === 'ai' ? 'ai' : 'rules' },
  });

  return res.status(200).json({
    ok: true,
    id: flow.id,
    versionId: version.id,
    version: version.version,
    tenantId,
  });
}
