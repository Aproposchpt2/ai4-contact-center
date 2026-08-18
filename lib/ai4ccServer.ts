import type { NextApiRequest } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

export type Ai4ccServerContext = {
  admin: SupabaseClient;
  userId: string;
  tenantId: string;
  role: string;
};

export async function requireAi4ccContext(req: NextApiRequest): Promise<Ai4ccServerContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !publishableKey || !serviceKey) throw new Error('AI4CC_STORAGE_NOT_CONFIGURED');

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let user = null as Awaited<ReturnType<typeof admin.auth.getUser>>['data']['user'];
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');

  if (token) {
    const { data, error } = await admin.auth.getUser(token);
    if (!error) user = data.user;
  } else {
    const server = createServerClient(supabaseUrl, publishableKey, {
      cookies: {
        getAll() {
          return Object.entries(req.cookies ?? {}).map(([name, value]) => ({ name, value: value ?? '' }));
        },
        setAll() {
          // API routes are read-only with respect to auth cookies; middleware handles refreshes.
        },
      },
    });
    const { data, error } = await server.auth.getUser();
    if (!error) user = data.user;
  }

  if (!user) throw new Error('AI4CC_NOT_AUTHENTICATED');

  const { data: membership, error: membershipError } = await admin
    .from('ai4cc_tenant_members')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${membershipError.message}`);
  if (!membership) throw new Error('AI4CC_NO_TENANT');

  return {
    admin,
    userId: user.id,
    tenantId: membership.tenant_id as string,
    role: membership.role as string,
  };
}

export function apiErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'AI4CC_NOT_AUTHENTICATED') return 401;
  if (message === 'AI4CC_NO_TENANT') return 403;
  if (message === 'AI4CC_STORAGE_NOT_CONFIGURED') return 503;
  return 500;
}

export function apiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'AI4CC_NOT_AUTHENTICATED') return 'Not authenticated';
  if (message === 'AI4CC_NO_TENANT') return 'No AI4 Contact Center tenant membership found';
  if (message === 'AI4CC_STORAGE_NOT_CONFIGURED') return 'Canonical Supabase storage is not configured';
  if (message.startsWith('AI4CC_MEMBERSHIP_ERROR:')) return message.slice('AI4CC_MEMBERSHIP_ERROR:'.length);
  return message;
}
