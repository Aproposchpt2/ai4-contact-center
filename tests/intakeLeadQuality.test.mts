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
  source.replace(clientImport, 'const createClient = () => globalThis.__intakeQualityClient;'),
)).toString('base64'));

const tenant = '00000000-0000-4000-8000-000000000030';
const actor = '00000000-0000-4000-8000-000000000031';
const interactionId = '00000000-0000-4000-8000-000000000032';
const contactId = '00000000-0000-4000-8000-000000000033';

function fixture(contact: { email: string | null; phone: string | null }, replayed: boolean) {
  const calls: any[] = [];
  const updates: any[] = [];
  const stored = { id: contactId, tenant_id: tenant, ...contact };
  (globalThis as any).__intakeQualityClient = {
    from(table: string) {
      const filters: Record<string, unknown> = {}; const nulls: string[] = []; let patch: any = null;
      const query: any = {
        select() { return query; },
        update(value: any) { patch = value; return query; },
        eq(key: string, value: unknown) { filters[key] = value; return query; },
        is(key: string, value: unknown) { if (value === null) nulls.push(key); return query; },
        async maybeSingle() {
          if (table === 'ai4cc_integrations') return { data: { tenant_id: tenant, config: { actor_user_id: actor } }, error: null };
          return { data: { id: interactionId, status: 'completed', metadata: { source: 'elevenlabs_agent' }, customer_identifier: '+17025550100' }, error: null };
        },
        then(resolve: any) {
          // Awaiting an update chain applies it only where the guarded columns are still empty.
          assert.equal(table, 'ai4cc_contacts');
          const match = filters.id === stored.id && filters.tenant_id === stored.tenant_id && nulls.every(k => (stored as any)[k] == null);
          if (match) { Object.assign(stored, patch); updates.push(patch); }
          return Promise.resolve({ data: match ? [{ id: stored.id }] : [], error: null }).then(resolve);
        },
      }; return query;
    },
    async rpc(name: string, args: any) {
      calls.push({ name, args });
      return { data: { lead: { id: 'lead-1' }, contact: { ...stored }, replayed }, error: null };
    },
  };
  return { calls, updates, stored };
}

async function submit(body: any) {
  const output: any = {};
  const response: any = { status(code: number) { output.status = code; return response; }, json(b: any) { output.body = b; return output; } };
  await mod.default({ method: 'POST', headers: { 'x-ai4cc-intake-key': 'test-key' }, body: { action: 'submit', interactionId, ...body } }, response);
  return output;
}

test('filler values are treated as empty', () => {
  for (const v of ['Unknown', 'not specified', 'None specified', 'N/A', 'n/a', 'None stated.', 'Not provided', 'TBD', 'None']) {
    assert.equal(mod.isPlaceholder(v), true, v);
  }
  for (const v of ['Green Grove', 'None of the above apply to us', 'Unknown Mortgage Co', '10 calls a day']) {
    assert.equal(mod.isPlaceholder(v), false, v);
  }
});

test('description keeps real lines and drops filler lines', () => {
  const input = [
    'Industry: Landscaping',
    'Estimated call volume: Unknown',
    'Existing systems: None specified',
    'Timeframe: Not specified',
    'Other problems: None stated',
    'Objections: None',
    'Questions for follow-up: Text messaging/SMS capabilities',
  ].join('\n');
  assert.equal(mod.stripPlaceholderLines(input), [
    'Industry: Landscaping',
    'Objections: None',
    'Questions for follow-up: Text messaging/SMS capabilities',
  ].join('\n'));
  assert.equal(mod.stripPlaceholderLines('Caller wants after-hours coverage.'), 'Caller wants after-hours coverage.');
});

test('first submit cleans filler before it reaches the lead', async () => {
  const f = fixture({ email: null, phone: null }, false);
  const result = await submit({ businessName: 'Unknown', callerName: 'Jeff', email: 'N/A', description: 'Industry: HVAC\nTimeframe: Not specified' });
  assert.equal(result.status, 201);
  const args = f.calls[0].args;
  assert.equal(args.p_company_name, null);
  assert.equal(args.p_contact_name, 'Jeff');
  assert.equal(args.p_email, null);
  assert.equal(args.p_description, 'Industry: HVAC');
  assert.equal(f.updates.length, 0);
});

test('a description made only of filler falls back to the default text', async () => {
  const f = fixture({ email: null, phone: null }, false);
  await submit({ callerName: 'Jeff', description: 'Industry: Unknown\nRole: Not specified' });
  assert.equal(f.calls[0].args.p_description, 'Lead captured by the conversational agent.');
});

test('a later submit fills an email the saved contact is missing', async () => {
  const f = fixture({ email: null, phone: '+17025550100' }, true);
  const result = await submit({ email: 'jmitchell@greengrove.com' });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.filled, ['email']);
  assert.equal(f.stored.email, 'jmitchell@greengrove.com');
  assert.equal(f.stored.phone, '+17025550100');
  assert.equal(result.body.contact.email, 'jmitchell@greengrove.com');
});

test('a later submit fills a missing phone from the callback number', async () => {
  const f = fixture({ email: 'a@example.com', phone: null }, true);
  const result = await submit({ phone: '702-262-2710' });
  assert.deepEqual(result.body.filled, ['phone']);
  assert.equal(f.stored.phone, '+17022622710');
  assert.equal(f.stored.email, 'a@example.com');
});

test('a later submit never overwrites details already saved', async () => {
  const f = fixture({ email: 'first@example.com', phone: '+17025550100' }, true);
  const result = await submit({ email: 'second@example.com', phone: '702-262-2710' });
  assert.equal(result.status, 200);
  assert.equal(result.body.filled, undefined);
  assert.equal(f.updates.length, 0);
  assert.equal(f.stored.email, 'first@example.com');
  assert.equal(f.stored.phone, '+17025550100');
});

test('missingContactFields only proposes empty fields', () => {
  assert.deepEqual(mod.missingContactFields({ email: null, phone: null }, { email: 'x@y.com', phone: '+1' }), { email: 'x@y.com', phone: '+1' });
  assert.deepEqual(mod.missingContactFields({ email: 'a@b.com', phone: null }, { email: 'x@y.com', phone: null }), {});
  assert.deepEqual(mod.missingContactFields(null, { email: 'x@y.com', phone: null }), {});
});
