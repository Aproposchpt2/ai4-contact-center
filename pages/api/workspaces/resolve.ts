import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { isValidTenantSlug, primaryRootDomain } from '@/lib/tenantHost';

// Public, minimal: turns a workspace name into its sign-in URL. Returns the same generic 404 for
// unknown, suspended and malformed names, and never returns tenant data.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  res.setHeader('Cache-Control', 'no-store');

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim().toLowerCase() : '';
  if (!isValidTenantSlug(slug)) return res.status(404).json({ error: 'Not found' });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: 'Unavailable' });

  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.from('ai4cc_tenants').select('slug').eq('slug', slug).eq('status', 'active').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ url: `https://${slug}.${primaryRootDomain()}/login` });
  } catch (err) {
    console.error('[workspaces/resolve] failed', err);
    return res.status(503).json({ error: 'Unavailable' });
  }
}
