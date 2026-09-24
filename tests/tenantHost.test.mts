import test from 'node:test';
import assert from 'node:assert/strict';
import { tenantSlugFromHost, isBlockedOnTenantHost, isValidTenantSlug, effectiveHost } from '../lib/tenantHost.ts';

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
