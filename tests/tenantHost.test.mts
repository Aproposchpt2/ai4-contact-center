import test from 'node:test';
import assert from 'node:assert/strict';
import { tenantSlugFromHost, isBlockedOnTenantHost, isValidTenantSlug, effectiveHost, isOperatorHost, isBlockedOnOperatorHost, isAppHost, isAllowedOnAppHost, primaryRootDomain, isSharedStateRoute } from '../lib/tenantHost.ts';

test('resolves a single-label tenant host under the default root', () => {
  assert.equal(tenantSlugFromHost('acme-plumbing.stellaruc.com'), 'acme-plumbing');
  assert.equal(tenantSlugFromHost('Acme-Plumbing.StellarUC.com:443'), 'acme-plumbing');
});

test('rejects the bare root, wrong roots, nested labels and reserved names', () => {
  for (const h of ['stellaruc.com', 'www.stellaruc.com', 'api.stellaruc.com', 'a.b.stellaruc.com', 'acme.evil.com', 'acme.stellaruc.com.evil.com', 'evilstellaruc.com', '', undefined, null]) {
    assert.equal(tenantSlugFromHost(h as string), null, String(h));
  }
});

test('first value of a comma-separated forwarded host is used', () => {
  assert.equal(tenantSlugFromHost('acme.stellaruc.com, proxy.internal'), 'acme');
});

test('slug validation', () => {
  assert.equal(isValidTenantSlug('ab'), false);
  assert.equal(isValidTenantSlug('-abc'), false);
  assert.equal(isValidTenantSlug('a--b'), false);
  assert.equal(isValidTenantSlug('acme-2'), true);
  assert.equal(isValidTenantSlug('admin'), false);
  assert.equal(isValidTenantSlug('api-staging'), false);
});

test('marketing and Apropos-data paths are blocked on tenant hosts', () => {
  for (const p of ['/acquisition', '/partners', '/demo', '/live/leads', '/platform/flow-authoring', '/api/public/leads', '/api/mission-control/status', '/ops-console']) {
    assert.equal(isBlockedOnTenantHost(p), true, p);
  }
  for (const p of ['/dashboard', '/lead-management', '/api/lead-management', '/web-chat', '/login', '/api/chat/message']) {
    assert.equal(isBlockedOnTenantHost(p), false, p);
  }
});

test('effectiveHost prefers the edge-forwarded host, honoring the edge secret when configured', () => {
  const h = (o: Record<string, string>) => (n: string) => o[n];
  delete process.env.AI4CC_EDGE_SECRET;
  assert.equal(effectiveHost(h({ 'x-ai4cc-forwarded-host': 'a.stellaruc.com', host: 'site.netlify.app' })), 'a.stellaruc.com');
  process.env.AI4CC_EDGE_SECRET = 's3';
  assert.equal(effectiveHost(h({ 'x-ai4cc-forwarded-host': 'a.stellaruc.com', host: 'site.netlify.app' })), 'site.netlify.app');
  assert.equal(effectiveHost(h({ 'x-ai4cc-forwarded-host': 'a.stellaruc.com', 'x-ai4cc-edge-key': 's3', host: 'site.netlify.app' })), 'a.stellaruc.com');
  delete process.env.AI4CC_EDGE_SECRET;
});

test('staging and production slug namespaces are disjoint', () => {
  delete process.env.AI4CC_ENVIRONMENT;
  assert.equal(isValidTenantSlug('stg-acme'), false);
  assert.equal(tenantSlugFromHost('stg-acme.stellaruc.com'), null);
  process.env.AI4CC_ENVIRONMENT = 'staging';
  assert.equal(isValidTenantSlug('stg-acme'), true);
  assert.equal(isValidTenantSlug('acme'), false);
  assert.equal(tenantSlugFromHost('stg-acme.stellaruc.com'), 'stg-acme');
  assert.equal(tenantSlugFromHost('acme.stellaruc.com'), null);
  delete process.env.AI4CC_ENVIRONMENT;
});

test('operator console host', () => {
  delete process.env.AI4CC_OPERATOR_HOSTS;
  assert.equal(isOperatorHost('admin.stellaruc.com'), true);
  assert.equal(isOperatorHost('Admin.StellarUC.com:443'), true);
  assert.equal(isOperatorHost('acme.stellaruc.com'), false);
  assert.equal(isOperatorHost('admin.evil.com'), false);
  assert.equal(isOperatorHost('x.admin.stellaruc.com'), false);
  assert.equal(tenantSlugFromHost('admin.stellaruc.com'), null); // reserved: never a workspace
  process.env.AI4CC_OPERATOR_HOSTS = 'ops.example.com';
  assert.equal(isOperatorHost('ops.example.com'), true);
  assert.equal(isOperatorHost('admin.stellaruc.com'), false);
  delete process.env.AI4CC_OPERATOR_HOSTS;
});

test('operator host blocks every public surface', () => {
  for (const p of ['/acquisition', '/demo', '/partners', '/live/leads', '/platform/x', '/api/public/leads', '/web-chat', '/api/chat/message', '/api/intake/webhook']) {
    assert.equal(isBlockedOnOperatorHost(p), true, p);
  }
  for (const p of ['/ops-console', '/dashboard', '/login', '/lead-management', '/api/mission-control/status']) {
    assert.equal(isBlockedOnOperatorHost(p), false, p);
  }
});

test('hostname map: app, admin, admin-staging, api hosts are never workspaces', () => {
  delete process.env.AI4CC_APP_HOSTS; delete process.env.AI4CC_OPERATOR_HOSTS;
  for (const h of ['app', 'admin', 'admin-staging', 'api', 'api-staging', 'www', 'help', 'status']) {
    assert.equal(tenantSlugFromHost(`${h}.stellaruc.com`), null, h);
  }
  assert.equal(tenantSlugFromHost('level-community.stellaruc.com'), 'level-community');
  assert.equal(isAppHost('app.stellaruc.com'), true);
  assert.equal(isAppHost('level-community.stellaruc.com'), false);
  assert.equal(isOperatorHost('admin-staging.stellaruc.com'), true);
  assert.equal(isOperatorHost('app.stellaruc.com'), false);
  assert.equal(primaryRootDomain(), 'stellaruc.com');
});

test('app host serves only the workspace finder', () => {
  assert.equal(isAllowedOnAppHost('/find-workspace'), true);
  assert.equal(isAllowedOnAppHost('/api/workspaces/resolve'), true);
  for (const p of ['/', '/dashboard', '/lead-management', '/api/lead-management', '/api/public/leads', '/login']) assert.equal(isAllowedOnAppHost(p), false, p);
});

test('shared-state routes are blocked on tenant hosts but tenant-safe ones are not', () => {
  for (const p of ['/prompt-manager', '/knowledge-vault', '/intent-taxonomy', '/flow-runtime-monitor', '/api/knowledge', '/api/prompts', '/api/intents/list', '/api/intents/save', '/api/versioning/branch', '/api/versioning/merge', '/api/runtime/events', '/api/runtime/incidents', '/api/runtime/mute', '/api/runtime/report', '/api/runtime/acknowledge']) {
    assert.equal(isSharedStateRoute(p), true, p);
    assert.equal(isBlockedOnTenantHost(p), true, p);
  }
  for (const p of ['/api/runtime/interactions', '/api/runtime/voicemails', '/api/runtime/voice-analytics', '/api/versioning/list', '/api/versioning/save', '/api/versioning/diff', '/api/versioning/rollback', '/lead-management', '/flow-versioning', '/api/knowledge-base-x-not-real']) {
    assert.equal(isBlockedOnTenantHost(p), false, p);
  }
  // staff console keeps them
  assert.equal(isBlockedOnOperatorHost('/prompt-manager'), false);
});
