import { HOME_TENANT_SLUG } from '@/lib/ai4ccServer';

// Navigation modules a tenant may see. Presentation-level only: every API route is tenant-scoped
// on its own, so hiding a module never protects data — it keeps a customer's workspace focused on
// what was sold and set up for them.
export const CORE_MODULES = [
  '/dashboard',
  '/lead-management',
  '/customer-360',
  '/voicemails',
  '/agent-workspace',
  '/voice-operations',
];

// branding.settings.modules: "all" | "core" | ["/href", ...]. Missing = core for customers and
// everything for the home (Apropos) tenant.
export function resolveModules(settings: unknown, tenantSlug: string): string[] | 'all' {
  const raw = (settings as { modules?: unknown } | null | undefined)?.modules;
  if (raw === 'all') return 'all';
  if (Array.isArray(raw)) {
    return Array.from(new Set(['/dashboard', ...raw.filter((v): v is string => typeof v === 'string' && v.startsWith('/'))]));
  }
  if (raw === 'core') return CORE_MODULES;
  return tenantSlug === HOME_TENANT_SLUG ? 'all' : CORE_MODULES;
}
