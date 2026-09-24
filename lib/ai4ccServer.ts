import type { NextApiRequest } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { effectiveHost, isOperatorHost, tenantSlugFromHost } from '@/lib/tenantHost';

// The tenant whose users may sign in on a bare (non-tenant) host such as the legacy
// ai4contactcenter.aproposgroupllc.com. Everyone else signs in on their own {slug}.<root> host.
export const HOME_TENANT_SLUG = process.env.AI4CC_HOME_TENANT_SLUG ?? 'apropos-group';

function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function requestHost(req: NextApiRequest): string | null {
  return effectiveHost((name) => headerValue(req.headers[name]));
}

export function requestTenantSlug(req: NextApiRequest): string | null {
  return tenantSlugFromHost(requestHost(req));
}

// Resolves which tenant this signed-in user is acting in.
//  - Tenant host (slug.<root>): the tenant is the host's tenant, and the user MUST be a member of
//    it. Unknown, suspended and not-a-member all return the same error so slugs can't be probed.
//  - Bare host: the home tenant if the user belongs to it, otherwise their oldest membership.
export async function resolveMembership(
  admin: SupabaseClient,
  userId: string,
  req: NextApiRequest,
): Promise<{ tenantId: string; role: string }> {
  const slug = requestTenantSlug(req);

  // Operator console: only owners/admins of the home tenant, acting in the home tenant.
  if (isOperatorHost(requestHost(req))) {
    const { data: home, error: homeErr } = await admin.from('ai4cc_tenants').select('id, status').eq('slug', HOME_TENANT_SLUG).maybeSingle();
    if (homeErr) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${homeErr.message}`);
    if (!home || home.status !== 'active') throw new Error('AI4CC_NOT_TENANT_MEMBER');
    const { data: op, error: opErr } = await admin
      .from('ai4cc_tenant_members')
      .select('tenant_id, role')
      .eq('tenant_id', home.id)
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .maybeSingle();
    if (opErr) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${opErr.message}`);
    if (!op) throw new Error('AI4CC_NOT_TENANT_MEMBER');
    return { tenantId: op.tenant_id as string, role: op.role as string };
  }

  if (slug) {
    const { data: tenant, error } = await admin
      .from('ai4cc_tenants')
      .select('id, status')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${error.message}`);
    if (!tenant || tenant.status !== 'active') throw new Error('AI4CC_NOT_TENANT_MEMBER');
    const { data: m, error: mErr } = await admin
      .from('ai4cc_tenant_members')
      .select('tenant_id, role')
      .eq('tenant_id', tenant.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (mErr) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${mErr.message}`);
    if (!m) throw new Error('AI4CC_NOT_TENANT_MEMBER');
    return { tenantId: m.tenant_id as string, role: m.role as string };
  }

  const { data: rows, error: rowsErr } = await admin
    .from('ai4cc_tenant_members')
    .select('tenant_id, role, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (rowsErr) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${rowsErr.message}`);
  if (!rows || rows.length === 0) throw new Error('AI4CC_NO_TENANT');

  const { data: tenants, error: tenantsErr } = await admin
    .from('ai4cc_tenants')
    .select('id, slug, status')
    .in('id', rows.map((r) => r.tenant_id));
  if (tenantsErr) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${tenantsErr.message}`);
  const activeById = new Map((tenants ?? []).filter((t) => t.status === 'active').map((t) => [t.id as string, t.slug as string]));

  const active = rows.filter((r) => activeById.has(r.tenant_id as string));
  if (active.length === 0) throw new Error('AI4CC_NO_TENANT');
  const home = active.find((r) => activeById.get(r.tenant_id as string) === HOME_TENANT_SLUG);
  const chosen = home ?? active[0];
  return { tenantId: chosen.tenant_id as string, role: chosen.role as string };
}

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

  const membership = await resolveMembership(admin, user.id, req);

  return {
    admin,
    userId: user.id,
    tenantId: membership.tenantId,
    role: membership.role,
  };
}

export function apiErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'AI4CC_NOT_AUTHENTICATED') return 401;
  if (message === 'AI4CC_NO_TENANT' || message === 'AI4CC_NOT_TENANT_MEMBER') return 403;
  if (message === 'AI4CC_STORAGE_NOT_CONFIGURED') return 503;
  return 500;
}

export function apiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'AI4CC_NOT_AUTHENTICATED') return 'Not authenticated';
  if (message === 'AI4CC_NO_TENANT') return 'No AI4 Contact Center tenant membership found';
  if (message === 'AI4CC_NOT_TENANT_MEMBER') return 'You do not have access to this workspace';
  if (message === 'AI4CC_STORAGE_NOT_CONFIGURED') return 'Canonical Supabase storage is not configured';
  if (message.startsWith('AI4CC_MEMBERSHIP_ERROR:')) return 'Could not verify workspace membership';
  return message;
}
