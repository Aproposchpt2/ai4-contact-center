import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

// ElevenLabs post-call webhook: records every voice call's lifecycle independently of the
// conversational intake tools in ./webhook.ts. Without it, a caller who hangs up before the
// agent invokes `start` leaves no CRM record at all, and the 60-minute timeout job has
// nothing to clean up.
//
// Authentication: ElevenLabs signs the raw request body with the workspace webhook secret
// (`ElevenLabs-Signature: t=<unix>,v0=<hex HMAC-SHA256 of "<t>.<raw body>">`). The secret
// lives only in ELEVENLABS_WEBHOOK_SECRET. The body parser is disabled so the signature is
// checked against the exact bytes received.
//
// Tenant binding: the tenant is never taken from the payload. The signed event's agent_id
// must match an active ai4cc_integrations row (provider='elevenlabs',
// integration_type='post_call_webhook', config = {agent_id, agent_number?}). The webhook
// is workspace-wide, so events for other agents are acknowledged and ignored rather than
// failed (repeated failures make the provider disable the webhook).
//
// Persistence: ai4cc_record_voice_call_event creates or reconciles one interaction per
// conversation atomically. It never creates a lead; a completed intake and its lead are
// left intact and only gain provider call details.

export const config = { api: { bodyParser: false } };

const SIGNATURE_HEADER = 'elevenlabs-signature';
const SIGNATURE_TOLERANCE_SECS = 30 * 60;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_TEXT = 2000;
const HANDLED_TYPES = new Set(['post_call_transcription', 'call_initiation_failure']);

type Json = Record<string, unknown>;

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('AI4CC_STORAGE_NOT_CONFIGURED');
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function obj(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
}

function str(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : '';
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function readRawBody(req: AsyncIterable<unknown>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new Error('AI4CC_WEBHOOK_BODY_TOO_LARGE');
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export function verifySignature(
  rawBody: Buffer | string, header: string | undefined, secret: string, nowSecs = Math.floor(Date.now() / 1000),
): boolean {
  if (!header || !secret) return false;
  let timestamp = '';
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v0') signatures.push(value);
  }
  if (!/^\d{1,12}$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSecs - Number(timestamp)) > SIGNATURE_TOLERANCE_SECS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest();
  return signatures.some(sig => {
    if (!/^[0-9a-f]{64}$/i.test(sig)) return false;
    return timingSafeEqual(Buffer.from(sig, 'hex'), expected);
  });
}

function unixToIso(value: unknown): string | null {
  const secs = num(value);
  return secs !== null && secs > 0 ? new Date(secs * 1000).toISOString() : null;
}

// Only fields the provider actually supplies are kept; nothing is inferred about the caller.
export function normalizeCallEvent(payload: unknown) {
  const body = obj(payload);
  const type = str(body.type);
  const data = obj(body.data);
  const metadata = obj(data.metadata);
  const phoneCall = obj(metadata.phone_call);
  const dynamicVars = obj(obj(data.conversation_initiation_client_data).dynamic_variables);
  const analysis = obj(data.analysis);

  const startedAt = unixToIso(metadata.start_time_unix_secs);
  const duration = num(metadata.call_duration_secs);
  const endedAt = startedAt && duration !== null && duration >= 0
    ? new Date(Date.parse(startedAt) + duration * 1000).toISOString()
    : null;

  const transcript = Array.isArray(data.transcript) ? data.transcript as unknown[] : [];
  const userTurnCount = transcript.filter(t => obj(t).role === 'user').length;
  const toolNames = transcript.flatMap(t => {
    const calls = obj(t).tool_calls;
    return Array.isArray(calls) ? calls.map(c => str(obj(c).tool_name)).filter(Boolean) : [];
  });

  const failureBody = obj(metadata.body);
  const callSid = str(phoneCall.call_sid) || str(dynamicVars.system__call_sid) || str(failureBody.CallSid);
  const callerPhone = str(phoneCall.external_number) || str(dynamicVars.system__caller_id) || str(failureBody.From);
  const agentNumber = str(phoneCall.agent_number) || str(dynamicVars.system__called_number) || str(failureBody.To);

  const details: Json = {
    agentId: str(data.agent_id) || null,
    callSid: callSid || null,
    agentNumber: agentNumber || null,
    terminationReason: str(metadata.termination_reason) || null,
    callDurationSecs: duration,
    conversationStatus: str(data.status) || null,
    callSuccessful: str(analysis.call_successful) || null,
    transcriptSummary: str(analysis.transcript_summary) || null,
    failureReason: str(data.failure_reason) || null,
    userTurnCount: type === 'post_call_transcription' ? userTurnCount : null,
    intakeToolCalled: type === 'post_call_transcription' ? toolNames.length > 0 : null,
  };
  for (const key of Object.keys(details)) if (details[key] === null) delete details[key];

  return {
    type,
    agentId: str(data.agent_id),
    conversationId: str(data.conversation_id),
    startedAt,
    endedAt,
    callerPhone: callerPhone || null,
    agentNumber: agentNumber || null,
    details,
  };
}

async function resolveTenant(db: SupabaseClient, agentId: string, agentNumber: string | null) {
  const { data, error } = await db
    .from('ai4cc_integrations')
    .select('tenant_id, config')
    .eq('provider', 'elevenlabs')
    .eq('integration_type', 'post_call_webhook')
    .eq('status', 'active')
    .eq('config->>agent_id', agentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Optional second binding: when the integration names its phone number, an event from a
  // different number on the same agent is not this tenant's call.
  const boundNumber = str(obj(data.config).agent_number);
  if (boundNumber && agentNumber && boundNumber !== agentNumber) return null;
  return data.tenant_id as string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[post-call] ELEVENLABS_WEBHOOK_SECRET is not configured');
    return res.status(503).json({ error: 'webhook not configured' });
  }

  let raw: Buffer;
  try {
    raw = await readRawBody(req);
  } catch {
    return res.status(413).json({ error: 'body too large' });
  }

  const header = req.headers[SIGNATURE_HEADER];
  if (!verifySignature(raw, Array.isArray(header) ? header[0] : header, secret)) {
    console.warn('[post-call] rejected event with missing or invalid signature');
    return res.status(401).json({ error: 'invalid signature' });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'invalid JSON' });
  }

  const event = normalizeCallEvent(payload);
  if (!HANDLED_TYPES.has(event.type)) return res.status(200).json({ ignored: 'event_type' });
  if (!event.agentId || !event.conversationId) return res.status(400).json({ error: 'agent_id and conversation_id are required' });

  try {
    const db = admin();
    const tenantId = await resolveTenant(db, event.agentId, event.agentNumber);
    if (!tenantId) {
      console.warn('[post-call] no active tenant binding for agent', event.agentId);
      return res.status(200).json({ ignored: 'agent_not_bound' });
    }

    const { data, error } = await db.rpc('ai4cc_record_voice_call_event', {
      p_tenant_id: tenantId,
      p_conversation_id: event.conversationId,
      p_event_type: event.type,
      p_started_at: event.startedAt,
      p_ended_at: event.endedAt,
      p_caller_phone: event.callerPhone,
      p_details: event.details,
    });
    if (error) {
      if (error.message?.includes('AI4CC_CALL_EVENT_SOURCE_INVALID')) {
        console.error('[post-call] conversation ID belongs to a non-agent interaction', event.conversationId);
        return res.status(200).json({ ignored: 'conversation_conflict' });
      }
      throw error;
    }
    return res.status(200).json(data);
  } catch (error) {
    // A 5xx lets the provider retry; the RPC is idempotent per conversation.
    console.error('[post-call] failed', error);
    return res.status(500).json({ error: 'post-call webhook failed' });
  }
}
