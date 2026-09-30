import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real /live mirror handlers with only their client-construction dependency replaced.
const clientImport = "import { createClient } from '@supabase/supabase-js';";
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';

async function load(path: string) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.ok(source.includes(clientImport));
  return import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(
    source.replace(clientImport, 'const createClient = () => globalThis.__publicMirrorClient;'),
  )).toString('base64'));
}
const contactsApi = await load('../pages/api/public/contacts.ts');
const leadsApi = await load('../pages/api/public/leads.ts');

function fixture(rows: any[]) {
  const seen: { select?: string } = {};
  (globalThis as any).__publicMirrorClient = {
    from() {
      const query: any = {
        select(columns: string) { seen.select = columns; return query; },
        eq() { return query; },
        order() { return query; },
        limit() { return Promise.resolve({ data: rows, error: null }); },
      };
      return query;
    },
  };
  return seen;
}

async function call(handler: any) {
  const res: any = { headers: {}, statusCode: 0, body: null,
    setHeader(k: string, v: string) { this.headers[k] = v; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; } };
  await handler({ method: 'GET', query: {}, cookies: {} }, res);
  return res;
}

test('contacts mirror shows initials and never a name or company', async () => {
  const seen = fixture([
    { id: '1', display_name: 'Sam Carter Jr', preferred_channel: 'voice', lead_score: 50 },
    { id: '2', display_name: 'maria', preferred_channel: 'voice', lead_score: null },
    { id: '3', display_name: '  ', preferred_channel: null, lead_score: null },
    { id: '4', display_name: null, preferred_channel: null, lead_score: null },
  ]);
  const res = await call(contactsApi.default);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.contacts.map((c: any) => c.display_name), ['S. C.', 'M.', 'Caller', 'Caller']);
  assert.ok(res.body.contacts.every((c: any) => c.company_name === null));
  assert.ok(!seen.select!.includes('company_name'));
  assert.ok(!JSON.stringify(res.body).includes('Carter'));
  assert.ok(!JSON.stringify(res.body).includes('maria'));
});

test('leads mirror replaces stored titles that name the caller company', async () => {
  fixture([
    { id: '1', title: 'Carter HVAC — voice intake', service_interest: 'After-hours answering', pipeline_stage: 'new' },
    { id: '2', title: 'Voice intake lead', service_interest: null, pipeline_stage: 'qualified' },
    { id: '3', title: 'Follow up with Maria Lopez', service_interest: null, pipeline_stage: 'follow_up' },
  ]);
  const res = await call(leadsApi.default);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.leads.map((l: any) => l.title), ['Voice intake lead', 'Voice intake lead', 'Lead']);
  assert.equal(res.body.leads[0].service_interest, 'After-hours answering');
  assert.equal(res.body.leads[1].pipeline_stage, 'qualified');
  assert.ok(!JSON.stringify(res.body).includes('Carter'));
  assert.ok(!JSON.stringify(res.body).includes('Lopez'));
});
