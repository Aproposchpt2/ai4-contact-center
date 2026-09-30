import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real /demo proof handler with only its client-construction dependency replaced.
const source = readFileSync(new URL('../pages/api/public/latest-call.ts', import.meta.url), 'utf8');
const clientImport = "import { createClient } from '@supabase/supabase-js';";
assert.ok(source.includes(clientImport));
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const mod = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(
  source.replace(clientImport, 'const createClient = () => globalThis.__latestCallClient;'),
)).toString('base64'));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

function fixture(interactions: any[]) {
  const seen: { interactionFilters: Record<string, unknown> } = { interactionFilters: {} };
  (globalThis as any).__latestCallClient = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const query: any = {
        select() { return query; },
        eq(key: string, value: unknown) { filters[key] = value; return query; },
        contains() { return query; },
        not() { return query; },
        order() { return query; },
        gte(key: string, value: string) { filters[`${key}>=`] = value; return query; },
        limit(n: number) {
          seen.interactionFilters = filters;
          const since = filters['started_at>='] as string;
          const rows = interactions.filter(r => r.started_at >= since).slice(0, n);
          return Promise.resolve({ data: rows, error: null });
        },
        async maybeSingle() {
          assert.equal(table, 'ai4cc_leads');
          return { data: { pipeline_stage: 'new' }, error: null };
        },
      };
      return query;
    },
  };
  return seen;
}

async function call(query: Record<string, string>, cookies: Record<string, string> = {}) {
  const res: any = { headers: {} as Record<string, string>, statusCode: 0, body: null,
    setHeader(k: string, v: string) { this.headers[k] = v; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; } };
  await mod.default({ method: 'GET', query, cookies }, res);
  return res;
}

const stranger = { id: 'a', customer_identifier: '+17025550199', started_at: minutesAgo(2), ended_at: minutesAgo(1),
  metadata: { callerName: 'Maria Lopez', phone: '+1 (702) 555-0199', businessName: 'Lopez Dental', description: 'After-hours calls' } };
const visitor = { id: 'b', customer_identifier: '+17255554321', started_at: minutesAgo(10), ended_at: minutesAgo(7),
  metadata: { callerName: 'Sam Carter Jr', phone: '725-555-4321', businessName: 'Carter HVAC', description: 'Missed calls' } };

test('without the last 4 digits nothing is returned and nothing is cached', async () => {
  fixture([stranger, visitor]);
  for (const query of [{}, { last4: '12' }, { last4: 'abcd' }, { last4: '12345' }]) {
    const res = await call(query);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.call, undefined);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
  }
});

test('returns only the call whose number ends in the given digits, not the most recent one', async () => {
  fixture([stranger, visitor]);
  const res = await call({ last4: '4321' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.equal(res.body.call.businessName, 'Carter HVAC');
  assert.equal(res.body.call.leadStage, 'new');
  assert.equal(res.body.call.duration, '3 min 0 sec');
});

test('masks the phone number and trims the name to a first name', async () => {
  fixture([visitor]);
  const res = await call({ last4: '4321' });
  assert.equal(res.body.call.callerName, 'Sam');
  assert.equal(res.body.call.phone, '(•••) •••-4321');
  assert.ok(!JSON.stringify(res.body).includes('555'));
  assert.ok(!JSON.stringify(res.body).includes('Carter Jr'));
});

test('falls back to the call record number when the agent did not capture one', async () => {
  fixture([{ ...visitor, metadata: { ...visitor.metadata, phone: undefined } }]);
  const res = await call({ last4: '4321' });
  assert.equal(res.body.call.businessName, 'Carter HVAC');
});

test('no match returns an empty result', async () => {
  fixture([stranger, visitor]);
  const res = await call({ last4: '0000' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.call, null);
});

test('only looks back one hour, or to the start of the demo session', async () => {
  const old = { ...visitor, started_at: minutesAgo(90), ended_at: minutesAgo(88) };
  fixture([old]);
  assert.equal((await call({ last4: '4321' })).body.call, null);

  fixture([visitor]);
  assert.equal((await call({ last4: '4321' }, { ai4cc_demo_started_at: minutesAgo(5) })).body.call, null);
  assert.equal((await call({ last4: '4321' }, { ai4cc_demo_started_at: minutesAgo(30) })).body.call.businessName, 'Carter HVAC');
});

test('is scoped to completed voice calls of the demo tenant', async () => {
  const seen = fixture([visitor]);
  await call({ last4: '4321' });
  assert.equal(seen.interactionFilters.tenant_id, '5885a020-d363-4c27-910a-c035eda132f5');
  assert.equal(seen.interactionFilters.channel, 'voice');
  assert.equal(seen.interactionFilters.status, 'completed');
});
