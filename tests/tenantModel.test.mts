import test from 'node:test';
import assert from 'node:assert/strict';

process.env.AI4CC_SCHEMA_MODEL = 'stellar';
const m = await import('../lib/tenantModel.ts');

test('stellar role vocabulary maps to the app roles', () => {
  assert.equal(m.normalizeRole('OWNER'), 'owner');
  assert.equal(m.normalizeRole('MANAGER'), 'supervisor');
  assert.equal(m.normalizeRole('AGENT'), 'agent');
  assert.equal(m.normalizeRole('VIEWER'), 'viewer');
  assert.deepEqual(m.dbRoles(['owner', 'admin']), ['OWNER', 'ADMIN']);
  assert.deepEqual(m.dbRoles(['supervisor', 'operator', 'agent']), ['MANAGER', 'AGENT']);
});

test('stellar tables', () => {
  assert.equal(m.TENANTS_TABLE, 'tenants');
  assert.equal(m.MEMBERS_TABLE, 'tenant_users');
  assert.equal(m.PHONE_NUMBERS_TABLE, 'tenant_phone_numbers');
});
