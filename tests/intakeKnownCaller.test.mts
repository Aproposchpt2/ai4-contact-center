import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real handler with only its client-construction dependency replaced.
const source = readFileSync(new URL('../pages/api/intake/webhook.ts', import.meta.url), 'utf8');
const clientImport = "import { createClient, type SupabaseClient } from '@supabase/supabase-js';";
assert.ok(source.includes(clientImport));
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const mod = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(
  source.replace(clientImport, 'const createClient = () => globalThis.__intakeKnownCallerClient;'),
)).toString('base64'));

const tenant = '00000000-0000-4000-8000-000000000040';
const actor = '00000000-0000-4000-8000-000000000041';

function fixture(contacts: Array<{ tenant_id: string; phone: string; display_name: string | null; updated_at: string }>, failLookup = false) {
  const lookups: any[] = [];
  (globalThis as any).__intakeKnownCallerClient = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const query: any = {
        select() { return query; },
        insert() { return query; },
        eq(key: string, value: unknown) { filters[key] = value; return query; },
        order() { return query; },
        limit() { return query; },
        async single() { return { data: { id: '00000000-0000-4000-8000-000000000042' }, error: null }; },
        async maybeSingle() {
          if (table === 'ai4cc_integrations') return { data: { tenant_id: tenant, config: { actor_user_id: actor } }, error: null };
          assert.equal(table, 'ai4cc_contacts');
          lookups.push({ ...filters });
          if (failLookup) return { data: null, error: { message: 'forced lookup failure' } };
          const match = contacts
            .filter(c => c.tenant_id === filters.tenant_id && c.phone === filters.phone)
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
          return { data: match ? { display_name: match.display_name } : null, error: null };
        },
      };
      return query;
    },
  };
  return { lookups };
}

async function start(callerPhone: string) {
  const output: any = {};
  const response: any = { status(code: number) { output.status = code; return response; }, json(b: any) { output.body = b; return output; } };
  await mod.default({ method: 'POST', headers: { 'x-ai4cc-intake-key': 'test-key' }, body: { action: 'start', conversationId: 'conv-known', callerPhone } }, response);
  return output;
}

test('a repeat caller is recognized by caller ID', async () => {
  const f = fixture([{ tenant_id: tenant, phone: '+17025550100', display_name: 'Jeffrey Mitchell', updated_at: '2026-10-01T00:00:00Z' }]);
  const result = await start('+17025550100');
  assert.equal(result.status, 201);
  assert.equal(result.body.knownCallerName, 'Jeffrey Mitchell');
  assert.deepEqual(f.lookups[0], { tenant_id: tenant, phone: '+17025550100' });
});

test('caller ID in another format still matches the saved E.164 number', async () => {
  fixture([{ tenant_id: tenant, phone: '+17025550100', display_name: 'Jeffrey Mitchell', updated_at: '2026-10-01T00:00:00Z' }]);
  assert.equal((await start('(702) 555-0100')).body.knownCallerName, 'Jeffrey Mitchell');
});

test('the most recently updated contact wins when several share a number', async () => {
  fixture([
    { tenant_id: tenant, phone: '+17025550100', display_name: 'Old Name', updated_at: '2026-09-01T00:00:00Z' },
    { tenant_id: tenant, phone: '+17025550100', display_name: 'Gary Miller', updated_at: '2026-10-01T00:00:00Z' },
  ]);
  assert.equal((await start('+17025550100')).body.knownCallerName, 'Gary Miller');
});

test('a new caller, a placeholder name or another tenant gives an empty name', async () => {
  fixture([{ tenant_id: 'other-tenant', phone: '+17025550100', display_name: 'Someone Else', updated_at: '2026-10-01T00:00:00Z' }]);
  assert.equal((await start('+17025550100')).body.knownCallerName, '');
  fixture([{ tenant_id: tenant, phone: '+17025550100', display_name: 'Unknown', updated_at: '2026-10-01T00:00:00Z' }]);
  assert.equal((await start('+17025550100')).body.knownCallerName, '');
});

test('a missing caller ID skips the lookup and a failed lookup never blocks the call', async () => {
  const f = fixture([]);
  const anonymous = await start('');
  assert.equal(anonymous.status, 201);
  assert.equal(anonymous.body.knownCallerName, '');
  assert.equal(f.lookups.length, 0);
  fixture([], true);
  const failed = await start('+17025550100');
  assert.equal(failed.status, 201);
  assert.equal(failed.body.knownCallerName, '');
  assert.equal(failed.body.transferAllowed === 'yes' || failed.body.transferAllowed === 'no', true);
});

async function initiate(body: any) {
  const output: any = {};
  const response: any = { status(code: number) { output.status = code; return response; }, json(b: any) { output.body = b; return output; } };
  await mod.default({ method: 'POST', headers: { 'x-ai4cc-intake-key': 'test-key' }, body }, response);
  return output;
}

test('the initiation webhook greets a returning caller by first name', async () => {
  fixture([{ tenant_id: tenant, phone: '+17025550100', display_name: 'Jeffrey Mitchell', updated_at: '2026-10-01T00:00:00Z' }]);
  const result = await initiate({ caller_id: '+17025550100', agent_id: 'agent_x', called_number: '+17025550199', call_sid: 'CA1' });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    type: 'conversation_initiation_client_data',
    dynamic_variables: {
      known_caller_name: 'Jeffrey Mitchell',
      greeting_question: 'Am I speaking with Jeffrey?',
      caller_number: '702-555-0100',
    },
  });
});

test('the initiation webhook gives a new caller the standard question', async () => {
  fixture([]);
  const result = await initiate({ caller_id: '+17025550100' });
  assert.equal(result.body.dynamic_variables.known_caller_name, '');
  assert.equal(result.body.dynamic_variables.greeting_question, "What's got you looking into us today?");
  const anonymous = await initiate({ caller_id: '' });
  assert.equal(anonymous.status, 200);
  assert.equal(anonymous.body.dynamic_variables.caller_number, '');
});

test('start_intake returns the caller ID for reading back', async () => {
  fixture([]);
  assert.equal((await start('+17025550100')).body.callerNumber, '702-555-0100');
});

test('a short or made-up callback number falls back to the caller ID', () => {
  assert.equal(mod.callbackPhone('5550123', '+17025550100'), '+17025550100');
  assert.equal(mod.callbackPhone('555-0123', '+17025550100'), '+17025550100');
  assert.equal(mod.callbackPhone('310-599-6999', '+17025550100'), '+13105996999');
  assert.equal(mod.callbackPhone('+44 20 7946 0958', '+17025550100'), '+442079460958');
});
