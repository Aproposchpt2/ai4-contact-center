import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type Result = { ok: true } | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Result>) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'DELETE only' });

  const flowId = typeof req.query.id === 'string' ? req.query.id : '';
  if (!flowId) return res.status(400).json({ error: 'id is required' });

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

  const { data: flow, error: flowLookupError } = await admin
    .from('ai4cc_flows')
    .select('id, name')
    .eq('id', flowId)
    .eq('tenant_id', membership.tenant_id)
    .maybeSingle();

  if (flowLookupError) return res.status(500).json({ error: flowLookupError.message });
  if (!flow) return res.status(404).json({ error: 'Flow not found' });

  const { error: deleteError } = await admin
    .from('ai4cc_flows')
    .delete()
    .eq('id', flowId)
    .eq('tenant_id', membership.tenant_id);

  if (deleteError) return res.status(500).json({ error: deleteError.message });

  await admin.from('ai4cc_audit_logs').insert({
    tenant_id: membership.tenant_id,
    actor_user_id: user.id,
    action: 'flow.deleted',
    resource_type: 'flow',
    resource_id: flowId,
    payload: { name: flow.name },
  });

  return res.status(200).json({ ok: true });
}
