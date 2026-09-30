import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Exercise real API handlers. Only context/client and unrelated simulation engines are stubbed.
const serverSource = readFileSync(new URL('../lib/ai4ccServer.ts', import.meta.url), 'utf8');
const errorHelpers = serverSource.slice(serverSource.indexOf('export function apiErrorStatus'));
async function load(path: string) {
  let source = readFileSync(new URL(path, import.meta.url), 'utf8');
  source = source.replace(/import \{[^\n]+\} from '@\/lib\/ai4ccServer';/, `
const requireAi4ccContext = async () => {
  const state = globalThis.__operatorAccess;
  if (state.error) throw new Error(state.error);
  return state.context;
};
${errorHelpers}`);
  source = source.replace(/import \{[^\n]+\} from '@\/lib\/agentAssistEngine';/, 'const generateGuidance = () => { throw new Error("Unexpected simulation execution"); };');
  source = source.replace(/import \{[^\n]+\} from '@\/lib\/qualityAssuranceEngine';/, 'const generateQAReport = () => { throw new Error("Unexpected simulation execution"); };');
  source = source.replace(/import \{[^\n]+\} from '@\/lib\/deploymentEngine';/, 'const validateFlow = () => ({ isValid: true, warnings: [] });');
  return (await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'))).default;
}
const voicemail = await load('../pages/api/runtime/voicemails.ts');
const operations = await load('../pages/api/lead-operations.ts');
const acceptance = await load('../pages/api/runtime/acceptance.ts');
const tenant = '00000000-0000-4000-8000-000000000010';
const leadId = '00000000-0000-4000-8000-000000000011';
function fixture(role = 'owner', error = '') {
  const state: any = { error, writes: 0, reads: 0, filters: [], rpcError: null };
  state.context = { role, tenantId: tenant, userId: 'actor', admin: {
    from(table: string) {
      state.reads++;
      const q: any = {
        select() { return q; }, update() { state.writes++; return q; },
        eq(key: string, value: unknown) { state.filters.push([table, key, value]); return q; },
        order() { return q; }, limit() { return q; },
        async single() { return { data: { id: leadId }, error: null }; },
        async maybeSingle() { return { data: table === 'ai4cc_leads' ? { id: leadId } : null, error: null }; },
        then(resolve: any) { return Promise.resolve({ data: [], error: null }).then(resolve); },
      }; return q;
    },
    async rpc() { return { data: {}, error: state.rpcError }; },
  }};
  (globalThis as any).__operatorAccess = state;
  return state;
}
async function request(handler: any, method: string, body: any = {}) {
  const output: any = {};
  const res: any = { status(code: number) { output.status = code; return res; }, json(body: any) { output.body = body; return output; }, setHeader() {} };
  await handler({ method, body, query: { leadId } }, res);
  return output;
}
test('viewer and unknown roles cannot mutate voicemails', async () => {
  for (const role of ['viewer', 'unknown']) {
    const s = fixture(role);
    assert.equal((await request(voicemail, 'PUT', { id: leadId, callback_status: 'resolved' })).status, 403);
    assert.equal(s.writes, 0); assert.equal(s.reads, 0);
  }
});
test('authorized voicemail updates remain tenant scoped', async () => {
  for (const role of ['owner', 'admin', 'supervisor', 'operator', 'agent']) {
    const s = fixture(role);
    assert.equal((await request(voicemail, 'PUT', { id: leadId, callback_status: 'reviewed' })).status, 200);
    assert.equal(s.writes, 1);
    assert.ok(s.filters.some((f: any[]) => f[1] === 'tenant_id' && f[2] === tenant));
  }
});
test('viewer can read voicemail and receives read-only capability', async () => {
  const s = fixture('viewer');
  const result = await request(voicemail, 'GET');
  assert.equal(result.status, 200); assert.equal(result.body.canManage, false); assert.equal(s.writes, 0);
});
test('owner voicemail reads expose manage capability', async () => {
  fixture('owner'); assert.equal((await request(voicemail, 'GET')).body.canManage, true);
});
test('read-only roles cannot start runtime acceptance simulations', async () => {
  for (const role of ['viewer', 'unknown']) {
    const s = fixture(role);
    assert.equal((await request(acceptance, 'POST')).status, 403);
    assert.equal(s.reads, 0); assert.equal(s.writes, 0);
  }
});
test('lead operation authentication and membership errors use correct HTTP status', async () => {
  for (const [error, status] of [['AI4CC_NOT_AUTHENTICATED', 401], ['AI4CC_NOT_TENANT_MEMBER', 403], ['AI4CC_NO_TENANT', 403], ['AI4CC_STORAGE_NOT_CONFIGURED', 503]] as const) {
    const s = fixture('owner', error);
    assert.equal((await request(operations, 'GET')).status, status); assert.equal(s.reads, 0);
  }
});
test('membership lost during a lead mutation returns forbidden', async () => {
  const s = fixture(); s.rpcError = { message: 'STELLAR_TENANT_MEMBERSHIP_REQUIRED' };
  assert.equal((await request(operations, 'POST', { leadId, operation: 'create_task', title: 'Follow up' })).status, 403);
});

const controlHandlers = [
  ['deploy', await load('../pages/api/deployment/deploy.ts'), { environment: 'production', versionId: leadId }],
  ['rollback', await load('../pages/api/deployment/rollback.ts'), { environment: 'production', versionId: leadId }],
  ['promote', await load('../pages/api/deployment/promote.ts'), { fromEnvironment: 'staging', toEnvironment: 'production', versionId: leadId }],
  ['validate stored version', await load('../pages/api/deployment/validate.ts'), { versionId: leadId }],
  ['voice destination', await load('../pages/api/voice-destinations.ts'), { action: 'create_destination', name: 'VAR only', destinationType: 'say' }],
] as const;
for (const [name, handler, body] of controlHandlers) {
  test(`${name} rejects agent, viewer and unknown roles before storage`, async () => {
    for (const role of ['agent', 'viewer', 'unknown']) {
      const s = fixture(role);
      assert.equal((await request(handler, 'POST', body)).status, 403);
      assert.equal(s.reads, 0); assert.equal(s.writes, 0);
    }
  });
  test(`${name} retains existing flow editor access`, async () => {
    for (const role of ['owner', 'admin', 'supervisor', 'operator']) {
      const s = fixture(role);
      assert.notEqual((await request(handler, 'POST', body)).status, 403);
      assert.ok(s.reads > 0);
    }
  });
}
test('viewer can validate an unsaved draft without changing canonical storage', async () => {
  const s = fixture('viewer');
  const result = await request(controlHandlers[3][1], 'POST', { flow: { nodes: [] } });
  assert.equal(result.status, 200); assert.equal(s.reads, 0); assert.equal(s.writes, 0);
});
