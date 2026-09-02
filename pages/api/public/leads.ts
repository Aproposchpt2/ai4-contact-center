import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Public, read-only, no-auth mirror of the real Lead Management list — proves the demo
// flow (call -> lead) without exposing the authenticated admin tool or write access.
// Deliberately excludes email/phone/notes fields even though this is single-tenant data;
// only what's needed to show the pipeline is real and working.

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
      .from('ai4cc_leads')
      .select('id, title, service_interest, pipeline_stage, priority, created_at, updated_at')
      .eq('tenant_id', TENANT_ID)
      .order('updated_at', { ascending: false })
      .limit(25);

    if (error) throw error;
    return res.status(200).json({ leads: data ?? [] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'public leads failed' });
  }
}
