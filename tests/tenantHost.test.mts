import test from 'node:test';
import assert from 'node:assert/strict';
import { tenantSlugFromHost, isBlockedOnTenantHost, isValidTenantSlug } from '../lib/tenantHost.ts';

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
