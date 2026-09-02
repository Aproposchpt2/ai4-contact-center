import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Public, read-only, no-auth mirror of Customer 360's contact list — same scoping
// discipline as pages/api/public/leads.ts: proves the platform is real without
// exposing email/phone or the authenticated admin tool.

const TENANT_ID = '5885a020-d363-4c27-910a-c035eda132f5';

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('AI4CC_STORAGE_NOT_CONFIGURED');
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');

  try {
    const db = admin();
    const { data, error } = await db
      .from('ai4cc_contacts')
      .select('id, display_name, company_name, preferred_channel, lead_score, created_at, updated_at')
      .eq('tenant_id', TENANT_ID)
      .order('updated_at', { ascending: false })
      .limit(25);

    if (error) throw error;
    return res.status(200).json({ contacts: data ?? [] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'public contacts failed' });
  }
}
