import type { NextApiRequest } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { effectiveHost, isOperatorHost, tenantSlugFromHost } from '@/lib/tenantHost';
import { membershipIn, membershipsForUser, tenantBySlug, tenantsByIds } from '@/lib/tenantModel';

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
    const home = await tenantBySlug(admin, HOME_TENANT_SLUG);
    if (!home || !home.active) throw new Error('AI4CC_NOT_TENANT_MEMBER');
    const op = await membershipIn(admin, home.id, userId, ['owner', 'admin']);
    if (!op) throw new Error('AI4CC_NOT_TENANT_MEMBER');
    return op;
  }

  if (slug) {
    const tenant = await tenantBySlug(admin, slug);
    if (!tenant || !tenant.active) throw new Error('AI4CC_NOT_TENANT_MEMBER');
    const m = await membershipIn(admin, tenant.id, userId);
    if (!m) throw new Error('AI4CC_NOT_TENANT_MEMBER');
    return m;
  }

  const rows = await membershipsForUser(admin, userId);
  if (rows.length === 0) throw new Error('AI4CC_NO_TENANT');

  const tenants = await tenantsByIds(admin, rows.map((r) => r.tenantId));
  const activeById = new Map(tenants.filter((t) => t.active).map((t) => [t.id, t.slug]));

  const active = rows.filter((r) => activeById.has(r.tenantId));
  if (active.length === 0) throw new Error('AI4CC_NO_TENANT');
  const home = active.find((r) => activeById.get(r.tenantId) === HOME_TENANT_SLUG);
  return home ?? active[0];
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
