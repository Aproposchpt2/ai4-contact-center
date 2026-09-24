// Host-based tenant resolution. Pure and edge-runtime safe (used by middleware and API routes).
// A tenant host looks like `{slug}.{root}` where root is one of AI4CC_TENANT_ROOT_DOMAINS
// (comma-separated, default "stellaruc.com"). Exactly one label is allowed in front of the root.

const DEFAULT_ROOTS = 'stellaruc.com';

export const RESERVED_SLUGS = new Set([
  'www', 'api', 'app', 'admin', 'demo', 'live', 'platform', 'partners', 'login', 'ops',
  'ops-console', 'mail', 'status', 'support', 'docs', 'help', 'staging', 'test', 'dev',
  'stellar', 'ai4cc', 'ai4', 'billing', 'cdn', 'static', 'assets', 'auth', 'sso', 'webhooks',
]);

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

export function isValidTenantSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !slug.includes('--') && !RESERVED_SLUGS.has(slug);
}

function rootDomains(): string[] {
  return (process.env.AI4CC_TENANT_ROOT_DOMAINS ?? DEFAULT_ROOTS)
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function tenantSlugFromHost(hostHeader: string | undefined | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  for (const root of rootDomains()) {
    if (!host.endsWith(`.${root}`)) continue;
    const label = host.slice(0, -(root.length + 1));
    if (label.includes('.')) return null;
    return isValidTenantSlug(label) ? label : null;
  }
  return null;
}

// Paths that belong to the marketing / Apropos-internal surface and must never be served on a
// customer's tenant host (they show Apropos data or sales content).
export function isBlockedOnTenantHost(pathname: string): boolean {
  return (
    pathname === '/acquisition' ||
    pathname === '/partners' ||
    pathname === '/demo' ||
    pathname === '/ops-console' ||
    pathname.startsWith('/platform/') ||
    pathname.startsWith('/live/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/mission-control/')
  );
}
