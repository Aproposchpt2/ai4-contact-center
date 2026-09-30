import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real handler with only its client-construction dependency replaced.
// Atomicity is separately tested against Postgres in supabase/tests/voice_intake_recovery.sql.
const source = readFileSync(new URL('../pages/api/intake/webhook.ts', import.meta.url), 'utf8');
const clientImport = "import { createClient, type SupabaseClient } from '@supabase/supabase-js';";
assert.ok(source.includes(clientImport));
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const mod = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(
  source.replace(clientImport, 'const createClient = () => globalThis.__intakeRecoveryClient;'),
)).toString('base64'));

const tenant = '00000000-0000-4000-8000-000000000010';
const actor = '00000000-0000-4000-8000-000000000011';
const interactionId = '00000000-0000-4000-8000-000000000012';
function fixture() {
  const rows = new Map<string, any>();
  let sequence = 20;
  const calls: any[] = [];
  const state = { failRpc: false, replayed: false, updates: 0 };
  const client = {
    from(table: string) {
      let input: any; const filters: Record<string, unknown> = {};
      const query: any = {
        select() { return query; },
        insert(value: any) { input = value; return query; },
        update() { state.updates++; throw new Error('Handler must not update interaction outside the RPC'); },
        eq(key: string, value: unknown) { filters[key] = value; return query; },
        async single() {
          if (input.external_id && [...rows.values()].some(r => r.tenant_id === input.tenant_id && r.channel === input.channel && r.external_id === input.external_id)) {
            return { data: null, error: { code: '23505' } };
          }
          const id = `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;
          rows.set(id, { id, ...input }); return { data: { id }, error: null };
        },
        async maybeSingle() {
          if (table === 'ai4cc_integrations') return { data: { tenant_id: tenant, config: { actor_user_id: actor } }, error: null };
          const row = [...rows.values()].find(r => Object.entries(filters).every(([k, v]) => r[k] === v));
          return { data: row ? structuredClone(row) : null, error: null };
        },
      }; return query;
    },
    async rpc(name: string, args: any) {
      calls.push({ name, args });
      if (state.failRpc) return { data: null, error: { message: 'forced test failure' } };
      return { data: { lead: { id: 'same-lead' }, contact: { phone: args.p_phone }, replayed: state.replayed }, error: null };
    },
  };
  (globalThis as any).__intakeRecoveryClient = client;
  rows.set(interactionId, { id: interactionId, tenant_id: tenant, channel: 'voice', status: 'open', customer_identifier: '+12025550199', metadata: { source: 'elevenlabs_agent' } });
  return { rows, calls, state };
}
async function request(body: any) {
  const output: any = {};
  const response: any = { status(code: number) { output.status = code; return response; }, json(body: any) { output.body = body; return output; } };
  await mod.default({ method: 'POST', headers: { 'x-ai4cc-intake-key': 'test-key' }, body }, response);
  return output;
}

test('invalid submitted phone falls back to valid caller ID', async () => {
  const f = fixture();
  const result = await request({ action: 'submit', interactionId, email: 'test@example.invalid', phone: 'not supplied' });
  assert.equal(result.status, 201);
  assert.equal(f.calls[0].name, 'ai4cc_submit_voice_intake');
  assert.equal(f.calls[0].args.p_phone, '+12025550199');
  assert.equal(f.calls[0].args.p_metadata.phone, '+12025550199');
  assert.equal(f.state.updates, 0);
});

test('valid callback takes precedence over a different caller ID', async () => {
  const f = fixture();
  await request({ action: 'submit', interactionId, phone: '(202) 555-0188' });
  assert.equal(f.calls[0].args.p_phone, '+12025550188');
});

test('RPC failure can be retried and replay returns success', async () => {
  const f = fixture(); f.state.failRpc = true;
  const first = await request({ action: 'submit', interactionId });
  assert.equal(first.status, 500); assert.equal(f.state.updates, 0);
  f.state.failRpc = false;
  assert.equal((await request({ action: 'submit', interactionId })).status, 201);
  f.rows.get(interactionId).status = 'completed'; f.state.replayed = true;
  const replay = await request({ action: 'submit', interactionId });
  assert.equal(replay.status, 200); assert.equal(replay.body.lead.id, 'same-lead');
});

test('legacy completed interaction without lead reaches the recovery RPC', async () => {
  const f = fixture(); f.rows.get(interactionId).status = 'completed';
  assert.equal((await request({ action: 'submit', interactionId })).status, 201);
  assert.equal(f.calls.length, 1);
});

test('simultaneous and repeated starts return the same interaction', async () => {
  const f = fixture();
  const body = { action: 'start', conversationId: 'same-conversation', callerPhone: '+12025550199', tenantId: 'ignored-attacker-tenant' };
  const [a, b] = await Promise.all([request(body), request(body)]);
  assert.deepEqual([a.status, b.status].sort(), [200, 201]);
  assert.equal(a.body.interactionId, b.body.interactionId);
  assert.equal((await request(body)).body.interactionId, a.body.interactionId);
  assert.equal(f.rows.get(a.body.interactionId).tenant_id, tenant);
});

test('cross-tenant interaction cannot reach submit RPC', async () => {
  const f = fixture(); f.rows.get(interactionId).tenant_id = 'foreign';
  assert.equal((await request({ action: 'submit', interactionId })).status, 404);
  assert.equal(f.calls.length, 0);
});

test('callback helper rejects both unusable values', () => {
  assert.equal(mod.callbackPhone('bad', 'also bad'), null);
  assert.equal(mod.callbackPhone('', '+12025550199'), '+12025550199');
});
