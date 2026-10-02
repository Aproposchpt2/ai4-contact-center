import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real handler with only its client-construction dependency replaced.
// Persistence semantics are tested against Postgres in supabase/tests/voice_call_lifecycle.sql.
const source = readFileSync(new URL('../pages/api/intake/post-call.ts', import.meta.url), 'utf8');
const clientImport = "import { createClient, type SupabaseClient } from '@supabase/supabase-js';";
assert.ok(source.includes(clientImport));
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const SECRET = 'wsec_test_only';
process.env.ELEVENLABS_WEBHOOK_SECRET = SECRET;
const mod = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(
  source.replace(clientImport, 'const createClient = () => globalThis.__postCallClient;'),
)).toString('base64'));

const tenant = '00000000-0000-4000-8000-000000000010';
const AGENT = 'agent_bound';
const START = 1790000000;

function event(overrides: Record<string, unknown> = {}, type = 'post_call_transcription') {
  return {
    type,
    event_timestamp: START + 20,
    data: {
      agent_id: AGENT,
      conversation_id: 'conv_early',
      status: 'done',
      transcript: [
        { role: 'agent', message: 'Thanks for calling.' },
        { role: 'user', message: 'Jeffrey Mitchell, Apropos Group.' },
      ],
      metadata: {
        start_time_unix_secs: START,
        call_duration_secs: 15,
        termination_reason: 'Remote party ended call',
        phone_call: { type: 'twilio', external_number: '+17023087429', agent_number: '+17253305102', call_sid: 'CA123' },
      },
      analysis: { call_successful: 'failure', transcript_summary: 'Caller gave a name then hung up.' },
      conversation_initiation_client_data: { dynamic_variables: { system__caller_id: '+17023087429' } },
      ...overrides,
    },
  };
}

function sign(body: string, t = Math.floor(Date.now() / 1000), secret = SECRET) {
  return `t=${t},v0=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
}

function fixture(binding: any = { tenant_id: tenant, config: { agent_id: AGENT } }) {
  const calls: any[] = [];
  const lookups: any[] = [];
  const state = { rpcError: null as any };
  (globalThis as any).__postCallClient = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const query: any = {
        select() { return query; },
        eq(key: string, value: unknown) { filters[key] = value; return query; },
        async maybeSingle() {
          lookups.push({ table, filters });
          return { data: filters['config->>agent_id'] === binding?.config?.agent_id ? binding : null, error: null };
        },
      };
      return query;
    },
    async rpc(name: string, args: any) {
      calls.push({ name, args });
      if (state.rpcError) return { data: null, error: state.rpcError };
      return { data: { interactionId: 'i-1', created: true, outcome: 'ended_before_intake', replayed: false }, error: null };
    },
  };
  return { calls, lookups, state };
}

async function post(body: string, signature?: string, method = 'POST') {
  const output: any = {};
  const response: any = { status(code: number) { output.status = code; return response; }, json(b: any) { output.body = b; return output; } };
  const req: any = {
    method,
    headers: signature === undefined ? {} : { 'elevenlabs-signature': signature },
    async *[Symbol.asyncIterator]() { yield Buffer.from(body); },
  };
  await mod.default(req, response);
  return output;
}

test('early hangup is recorded from the signed post-call event without a lead', async () => {
  const f = fixture();
  const body = JSON.stringify(event());
  const result = await post(body, sign(body));
  assert.equal(result.status, 200);
  assert.equal(f.calls.length, 1);
  const { name, args } = f.calls[0];
  assert.equal(name, 'ai4cc_record_voice_call_event');
  assert.equal(args.p_tenant_id, tenant);
  assert.equal(args.p_conversation_id, 'conv_early');
  assert.equal(args.p_event_type, 'post_call_transcription');
  assert.equal(args.p_started_at, new Date(START * 1000).toISOString());
  assert.equal(args.p_ended_at, new Date((START + 15) * 1000).toISOString());
  assert.equal(args.p_caller_phone, '+17023087429');
  assert.deepEqual(args.p_details, {
    agentId: AGENT, callSid: 'CA123', agentNumber: '+17253305102',
    terminationReason: 'Remote party ended call', callDurationSecs: 15, conversationStatus: 'done',
    callSuccessful: 'failure', transcriptSummary: 'Caller gave a name then hung up.',
    userTurnCount: 1, intakeToolCalled: false,
  });
  assert.ok(!f.calls.some(c => c.name === 'ai4cc_submit_voice_intake'));
});

test('tool calls in the transcript are reported as intake invoked', () => {
  const e = event({ transcript: [{ role: 'agent', tool_calls: [{ tool_name: 'start_intake' }] }] });
  assert.equal(mod.normalizeCallEvent(e).details.intakeToolCalled, true);
});

test('missing, forged, stale and wrong-secret signatures are rejected before any lookup', async () => {
  const f = fixture();
  const body = JSON.stringify(event());
  const now = Math.floor(Date.now() / 1000);
  for (const signature of [undefined, 'garbage', sign(body, now, 'wrong-secret'), sign(body, now - 31 * 60), sign(body + ' ', now)]) {
    const result = await post(body, signature);
    assert.equal(result.status, 401, String(signature));
  }
  const tampered = JSON.stringify(event({ conversation_id: 'conv_other' }));
  assert.equal((await post(tampered, sign(body))).status, 401);
  assert.equal(f.lookups.length, 0);
  assert.equal(f.calls.length, 0);
});

test('signature helper accepts any matching v0 entry and rejects malformed ones', () => {
  const body = '{"a":1}';
  const t = 1790000000;
  const good = sign(body, t).split(',')[1];
  assert.equal(mod.verifySignature(body, `t=${t},v0=${'0'.repeat(64)},${good}`, SECRET, t), true);
  assert.equal(mod.verifySignature(body, `t=${t},v0=abc`, SECRET, t), false);
  assert.equal(mod.verifySignature(body, `v0=${good.slice(3)}`, SECRET, t), false);
});

test('events for an agent with no tenant binding are acknowledged and not stored', async () => {
  const f = fixture();
  const body = JSON.stringify(event({ agent_id: 'agent_someone_else' }));
  const result = await post(body, sign(body));
  assert.equal(result.status, 200);
  assert.equal(result.body.ignored, 'agent_not_bound');
  assert.equal(f.calls.length, 0);
});

test('a bound number rejects events from a different number on the same agent', async () => {
  const f = fixture({ tenant_id: tenant, config: { agent_id: AGENT, agent_number: '+17255550000' } });
  const body = JSON.stringify(event());
  const result = await post(body, sign(body));
  assert.equal(result.body.ignored, 'agent_not_bound');
  assert.equal(f.calls.length, 0);
});

test('audio and unknown event types are acknowledged without storage', async () => {
  const f = fixture();
  const body = JSON.stringify(event({}, 'post_call_audio'));
  const result = await post(body, sign(body));
  assert.equal(result.status, 200);
  assert.equal(result.body.ignored, 'event_type');
  assert.equal(f.calls.length, 0);
});

test('initiation failure is recorded with the Twilio caller and failure reason', async () => {
  const f = fixture();
  const body = JSON.stringify({
    type: 'call_initiation_failure',
    event_timestamp: START,
    data: { agent_id: AGENT, conversation_id: 'conv_fail', failure_reason: 'busy',
      metadata: { type: 'twilio', body: { CallSid: 'CA9', From: '+17023087429', To: '+17253305102' } } },
  });
  const result = await post(body, sign(body));
  assert.equal(result.status, 200);
  const { args } = f.calls[0];
  assert.equal(args.p_event_type, 'call_initiation_failure');
  assert.equal(args.p_started_at, null);
  assert.equal(args.p_ended_at, null);
  assert.equal(args.p_caller_phone, '+17023087429');
  assert.deepEqual(args.p_details, { agentId: AGENT, callSid: 'CA9', agentNumber: '+17253305102', failureReason: 'busy' });
});

test('storage failure returns 5xx so the provider retries; source conflicts do not', async () => {
  const f = fixture();
  const body = JSON.stringify(event());
  f.state.rpcError = { message: 'connection reset' };
  assert.equal((await post(body, sign(body))).status, 500);
  f.state.rpcError = { message: 'AI4CC_CALL_EVENT_SOURCE_INVALID' };
  const conflict = await post(body, sign(body));
  assert.equal(conflict.status, 200);
  assert.equal(conflict.body.ignored, 'conversation_conflict');
});

test('invalid JSON, missing IDs and non-POST are rejected', async () => {
  fixture();
  assert.equal((await post('not json', sign('not json'))).status, 400);
  const noId = JSON.stringify(event({ conversation_id: '' }));
  assert.equal((await post(noId, sign(noId))).status, 400);
  assert.equal((await post('', undefined, 'GET')).status, 405);
});

test('unconfigured secret fails closed', async () => {
  fixture();
  delete process.env.ELEVENLABS_WEBHOOK_SECRET;
  try {
    const body = JSON.stringify(event());
    assert.equal((await post(body, sign(body))).status, 503);
  } finally {
    process.env.ELEVENLABS_WEBHOOK_SECRET = SECRET;
  }
});
