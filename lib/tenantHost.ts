// Host-based tenant resolution. Pure and edge-runtime safe (used by middleware and API routes).
// Hostname map (stellaruc.com):
//   stellaruc.com, www            public promotional site
//   app.<root>                    generic customer entry: finds a workspace, holds no customer data
//   {client}.<root>               one customer's tenant workspace (this file's "tenant host")
//   admin.<root>, admin-staging   internal operator console
//   api.<root>, api-staging       telephony backend (separate Netlify site, not this app)
// A tenant host looks like `{slug}.{root}` where root is one of AI4CC_TENANT_ROOT_DOMAINS
// (comma-separated, default "stellaruc.com"). Exactly one label is allowed in front of the root.

const DEFAULT_ROOTS = 'stellaruc.com';

export const RESERVED_SLUGS = new Set([
  'www', 'api', 'app', 'admin', 'demo', 'live', 'platform', 'partners', 'login', 'ops',
  'ops-console', 'mail', 'status', 'support', 'docs', 'help', 'staging', 'test', 'dev',
  'stellar', 'ai4cc', 'ai4', 'billing', 'cdn', 'static', 'assets', 'auth', 'sso', 'webhooks', 'find-workspace',
]);

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

// Staging and production share the stellaruc.com zone (one Cloudflare Worker routes by prefix).
// Staging workspaces are {stg-name}.stellaruc.com; production slugs may never start with "stg-",
// and a staging app only accepts "stg-" slugs, so the two environments cannot collide or leak.
export const STAGING_PREFIX = 'stg-';
const isStagingApp = () => process.env.AI4CC_ENVIRONMENT === 'staging';

export function isValidTenantSlug(slug: string): boolean {
  // "api-*" / "admin-*" hostnames (api-staging, admin-staging) are service hosts, never workspaces.
  if (!SLUG_RE.test(slug) || slug.includes('--') || RESERVED_SLUGS.has(slug)) return false;
  if (slug.startsWith('api-') || slug.startsWith('admin-')) return false;
  return slug.startsWith(STAGING_PREFIX) === isStagingApp();
}

function normalizeHost(hostHeader: string): string {
  return hostHeader.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

export function primaryRootDomain(): string {
  return rootDomains()[0] ?? DEFAULT_ROOTS;
}

function rootDomains(): string[] {
  return (process.env.AI4CC_TENANT_ROOT_DOMAINS ?? DEFAULT_ROOTS)
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

// The host the customer actually typed. Behind the Cloudflare Worker (which proxies
// *.<root> to the Netlify site) it arrives in x-ai4cc-forwarded-host; when AI4CC_EDGE_SECRET is
// set, that header is honored only together with a matching x-ai4cc-edge-key. Membership is still
// verified server-side, so a spoofed host can never grant access to another tenant's data.
export function effectiveHost(get: (name: string) => string | undefined | null): string | null {
  const forwarded = get('x-ai4cc-forwarded-host');
  const secret = process.env.AI4CC_EDGE_SECRET;
  if (forwarded && (!secret || get('x-ai4cc-edge-key') === secret)) return forwarded;
  return get('x-forwarded-host') ?? get('host') ?? null;
}

export function tenantSlugFromHost(hostHeader: string | undefined | null): string | null {
  if (!hostHeader) return null;
  const host = normalizeHost(hostHeader);
  for (const root of rootDomains()) {
    if (!host.endsWith(`.${root}`)) continue;
    const label = host.slice(0, -(root.length + 1));
    if (label.includes('.')) return null;
    return isValidTenantSlug(label) ? label : null;
  }
  return null;
}

// Operator console hosts (default admin.<root>): staff-only. Set AI4CC_OPERATOR_HOSTS to a
// comma-separated list of full hostnames to override.
export function isOperatorHost(hostHeader: string | undefined | null): boolean {
  if (!hostHeader) return false;
  const host = normalizeHost(hostHeader);
  const configured = process.env.AI4CC_OPERATOR_HOSTS;
  const hosts = configured ? configured.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean) : rootDomains().flatMap((r) => [`admin.${r}`, `admin-staging.${r}`]);
  return hosts.includes(host);
}

// Generic customer entry host (default app.<root>; override with AI4CC_APP_HOSTS). It serves only
// the workspace finder; customers do their real work on their own {client}.<root> host.
export function isAppHost(hostHeader: string | undefined | null): boolean {
  if (!hostHeader) return false;
  const host = normalizeHost(hostHeader);
  const configured = process.env.AI4CC_APP_HOSTS;
  const hosts = configured ? configured.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean) : rootDomains().map((r) => `app.${r}`);
  return hosts.includes(host);
}

export const APP_HOST_PUBLIC_PATHS = ['/find-workspace', '/api/workspaces/resolve'];

export function isAllowedOnAppHost(pathname: string): boolean {
  return APP_HOST_PUBLIC_PATHS.includes(pathname);
}

// Everything a public visitor could use must not exist on the operator console.
export function isBlockedOnOperatorHost(pathname: string): boolean {
  return (
    pathname === '/acquisition' ||
    pathname === '/partners' ||
    pathname === '/demo' ||
    pathname === '/web-chat' ||
    pathname.startsWith('/platform/') ||
    pathname.startsWith('/live/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/chat/') ||
    pathname.startsWith('/api/intake/')
  );
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
