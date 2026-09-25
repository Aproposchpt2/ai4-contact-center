import type { SupabaseClient } from '@supabase/supabase-js';

// Two database shapes are supported so the same build can run against either project:
//  - legacy  (default): ai4cc_tenants / ai4cc_tenant_members, lowercase roles and status.
//  - stellar: public.tenants / public.tenant_users, uppercase roles and status, tenant_slug / business_name.
// Select with AI4CC_SCHEMA_MODEL=stellar. Callers always see the legacy vocabulary
// (id, name, slug, timezone, active boolean, role owner|admin|supervisor|operator|agent|viewer).
export const STELLAR = process.env.AI4CC_SCHEMA_MODEL === 'stellar';

export const TENANTS_TABLE = STELLAR ? 'tenants' : 'ai4cc_tenants';
export const MEMBERS_TABLE = STELLAR ? 'tenant_users' : 'ai4cc_tenant_members';
export const PHONE_NUMBERS_TABLE = STELLAR ? 'tenant_phone_numbers' : 'ai4cc_phone_numbers';

const NAME_COL = STELLAR ? 'business_name' : 'name';
const SLUG_COL = STELLAR ? 'tenant_slug' : 'slug';
const TENANT_COLS = `id, ${NAME_COL}, ${SLUG_COL}, status, timezone`;

const ROLE_FROM_STELLAR: Record<string, string> = { OWNER: 'owner', ADMIN: 'admin', MANAGER: 'supervisor', AGENT: 'agent', VIEWER: 'viewer' };
const ROLE_TO_STELLAR: Record<string, string> = { owner: 'OWNER', admin: 'ADMIN', supervisor: 'MANAGER', operator: 'AGENT', agent: 'AGENT', viewer: 'VIEWER' };

export function normalizeRole(role: unknown): string {
  const raw = String(role ?? '');
  return STELLAR ? ROLE_FROM_STELLAR[raw.toUpperCase()] ?? raw.toLowerCase() : raw.toLowerCase();
}

export function dbRoles(roles: string[]): string[] {
  return STELLAR ? Array.from(new Set(roles.map((r) => ROLE_TO_STELLAR[r] ?? r.toUpperCase()))) : roles;
}

export function dbRole(role: string): string {
  return STELLAR ? ROLE_TO_STELLAR[role] ?? role.toUpperCase() : role;
}

// Legacy: only 'active'. Stellar: a tenant in SETUP is being onboarded and may already use its workspace;
// SUSPENDED and CANCELLED tenants are locked out.
const WORKSPACE_STATUSES = new Set(STELLAR ? ['active', 'setup'] : ['active']);

export type TenantRow = { id: string; name: string; slug: string; timezone: string; active: boolean };

function toTenant(r: Record<string, unknown>): TenantRow {
  return {
    id: r.id as string,
    name: r[NAME_COL] as string,
    slug: r[SLUG_COL] as string,
    timezone: (r.timezone as string) ?? 'America/Los_Angeles',
    active: WORKSPACE_STATUSES.has(String(r.status).toLowerCase()),
  };
}

export async function tenantBySlug(admin: SupabaseClient, slug: string): Promise<TenantRow | null> {
  const { data, error } = await admin.from(TENANTS_TABLE).select(TENANT_COLS).eq(SLUG_COL, slug).maybeSingle();
  if (error) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${error.message}`);
  return data ? toTenant(data as unknown as Record<string, unknown>) : null;
}

export async function tenantById(admin: SupabaseClient, id: string): Promise<TenantRow | null> {
  const { data, error } = await admin.from(TENANTS_TABLE).select(TENANT_COLS).eq('id', id).maybeSingle();
  if (error) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${error.message}`);
  return data ? toTenant(data as unknown as Record<string, unknown>) : null;
}

export async function tenantsByIds(admin: SupabaseClient, ids: string[]): Promise<TenantRow[]> {
  const { data, error } = await admin.from(TENANTS_TABLE).select(TENANT_COLS).in('id', ids);
  if (error) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${error.message}`);
  return (data ?? []).map((r) => toTenant(r as unknown as Record<string, unknown>));
}

// Membership rows for a user. Stellar rows must be ACTIVE (INVITED and DISABLED never grant access).
export async function membershipsForUser(admin: SupabaseClient, userId: string): Promise<{ tenantId: string; role: string }[]> {
  let q = admin.from(MEMBERS_TABLE).select('tenant_id, role, created_at').eq('user_id', userId);
  if (STELLAR) q = q.eq('status', 'ACTIVE');
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${error.message}`);
  return (data ?? []).map((r) => ({ tenantId: r.tenant_id as string, role: normalizeRole(r.role) }));
}

// One membership in one tenant, optionally limited to the given roles (legacy vocabulary).
export async function membershipIn(
  admin: SupabaseClient,
  tenantId: string,
  userId: string,
  roles?: string[],
): Promise<{ tenantId: string; role: string } | null> {
  let q = admin.from(MEMBERS_TABLE).select('tenant_id, role').eq('tenant_id', tenantId).eq('user_id', userId);
  if (STELLAR) q = q.eq('status', 'ACTIVE');
  if (roles) q = q.in('role', dbRoles(roles));
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`AI4CC_MEMBERSHIP_ERROR:${error.message}`);
  return data ? { tenantId: data.tenant_id as string, role: normalizeRole(data.role) } : null;
}
