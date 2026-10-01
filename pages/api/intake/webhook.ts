import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Self-contained AI4 Contact Center voice-intake webhook.
// Called by the "AI4CC Business Intake Agent" ElevenLabs agent (native Twilio phone
// integration, not routed through this app's Twilio Studio flow). Machine-to-machine,
// so it's carved out of the Supabase session gate (see PUBLIC_PREFIXES in
// utils/supabase/middleware.ts) — same no-shared-secret pattern already used by this
// workspace's other agent webhooks (e.g. Customer Support's log_call/lookup_caller).
// It only ever creates lead records; nothing sensitive is read back.
//
// Not associated with NAT-CORP or any other product — this feeds AI4CC's own
// ai4cc_contacts / ai4cc_leads pipeline directly, the same tables the Lead Management
// dashboard and Agent Workspace already read from.

// Tenant isolation: the tenant is NEVER read from the request body. Each caller presents a
// per-tenant intake key in the `x-ai4cc-intake-key` header. Only the SHA-256 of the key is
// stored, in ai4cc_integrations (provider='elevenlabs', integration_type='intake_webhook',
// status='active', config = {key_sha256, actor_user_id}). The matching row supplies the
// tenant and the tenant-member actor the lead RPC requires (ai4cc_create_lead_from_interaction
// rejects actors that are not members of the tenant).
const KEY_HEADER = 'x-ai4cc-intake-key';

// TEMPORARY: the live Apropos demo agent predates keys. Until its ElevenLabs tools send the
// header, unkeyed calls are attributed to Apropos's own tenant only. Set
// AI4CC_INTAKE_ALLOW_UNKEYED=false in Netlify to close this door (then unkeyed calls get 401).
const LEGACY_TENANT_ID = '5885a020-d363-4c27-910a-c035eda132f5';
// Must be an active member (tenant_users) of LEGACY_TENANT_ID in whichever Supabase project
// this deploy points at — override per environment via AI4CC_INTAKE_FALLBACK_ACTOR_ID rather
// than editing this default when the project changes (e.g. legacy -> production cutover).
const LEGACY_ACTOR_USER_ID = process.env.AI4CC_INTAKE_FALLBACK_ACTOR_ID || '735fc481-1b75-4cf3-9f68-128e9e169fdc';
const ALLOW_UNKEYED = process.env.AI4CC_INTAKE_ALLOW_UNKEYED !== 'false';

const MAX_TEXT = 2000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type IntakeScope = { tenantId: string; actorUserId: string };

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('AI4CC_STORAGE_NOT_CONFIGURED');
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : '';
}

async function resolveScope(db: SupabaseClient, req: NextApiRequest): Promise<IntakeScope | null> {
  const raw = req.headers[KEY_HEADER];
  const key = (Array.isArray(raw) ? raw[0] : raw)?.trim();

  if (!key) {
    if (!ALLOW_UNKEYED) return null;
    console.warn('[intake] unkeyed call accepted for legacy Apropos tenant');
    return { tenantId: LEGACY_TENANT_ID, actorUserId: LEGACY_ACTOR_USER_ID };
  }

  const hash = createHash('sha256').update(key).digest('hex');
  const { data, error } = await db
    .from('ai4cc_integrations')
    .select('tenant_id, config')
    .eq('provider', 'elevenlabs')
    .eq('integration_type', 'intake_webhook')
    .eq('status', 'active')
    .eq('config->>key_sha256', hash)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const actor = (data.config as { actor_user_id?: unknown } | null)?.actor_user_id;
  if (typeof actor !== 'string' || !UUID_RE.test(actor)) {
    console.error('[intake] integration row has no valid actor_user_id', data.tenant_id);
    return null;
  }
  return { tenantId: data.tenant_id as string, actorUserId: actor };
}

export function normalizePhone(value: string): string | null {
  const raw = value.trim();
  if (!raw || !/^[+\d().\-\s]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits;
}

// Voice transcription can put hyphens between each spelled-out character in
// either the local part or a domain label. Collapse only runs of at least four
// single alphanumeric characters; preserve dotted boundaries and ordinary
// hyphenated words. This is a recovery heuristic for the observed voice artifact,
// not a general rule that every single-character hyphenated address is invalid.
// Keep the existing export name for callers and tests.
export function collapseSpelledOutLocalPart(email: string): string {
  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return email;
  const collapse = (part: string) =>
    /^[a-z0-9](?:-[a-z0-9]){3,}$/i.test(part) ? part.replace(/-/g, '') : part;
  const local = collapse(email.slice(0, at));
  const domain = email.slice(at + 1).split('.').map(collapse).join('.');
  return `${local}@${domain}`;
}

// 2026-09-30 fix: previously this nulled out phone entirely whenever email was
// present, even when a real caller-supplied phone was also available -- the
// same report flagged this as dropping the callback number on every voice
// lead. Preserve both when both exist; email still wins as the primary
// identifier/type, matching prior behavior for everything else.
export function classifyIdentifier(rawEmail: unknown, rawPhone: unknown) {
  const emailRaw = text(rawEmail);
  const email = emailRaw ? collapseSpelledOutLocalPart(emailRaw) : emailRaw;
  const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phone = normalizePhone(text(rawPhone));
  if (email && emailLike.test(email)) {
    return { type: 'email' as const, value: email, email: email.toLowerCase(), phone };
  }
  if (phone) return { type: 'phone' as const, value: phone, email: null as string | null, phone };
  return { type: 'opaque' as const, value: email || text(rawPhone) || 'Unknown contact', email: null, phone: null };
}

// A callback number must be a full number with its area code. Anything shorter,
// such as "555-0123" made up when the caller said "same number", falls back to
// the caller ID.
export function callbackPhone(submitted: unknown, callerId: unknown): string | null {
  const full = normalizePhone(text(submitted));
  return (full?.startsWith('+') ? full : null) || normalizePhone(text(callerId));
}

// The caller ID in the form the agent reads back ("702-555-0100").
export function formatCallerNumber(callerPhone: string): string {
  const phone = normalizePhone(callerPhone);
  const us = phone?.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return us ? `${us[1]}-${us[2]}-${us[3]}` : phone ?? '';
}

// The question that ends the first message: a returning caller is asked to
// confirm the saved first name, a new caller is asked why they called.
export function greetingQuestion(knownName: string): string {
  const first = knownName.split(/\s+/)[0];
  return first ? `Am I speaking with ${first}?` : "What's got you looking into us today?";
}

// Live transfers to a specialist are allowed Monday to Friday, 8 AM to 6 PM
// Pacific (daylight saving handled by the time zone). The agent is told the
// answer at call start instead of working it out from the clock, which it did
// unreliably.
const TRANSFER_TZ = 'America/Los_Angeles';
const TRANSFER_START_HOUR = 8;
const TRANSFER_END_HOUR = 18;

export function transferWindowOpen(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TRANSFER_TZ, weekday: 'short', hour: 'numeric', hourCycle: 'h23',
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  return hour >= TRANSFER_START_HOUR && hour < TRANSFER_END_HOUR;
}

function transferAllowed(): 'yes' | 'no' {
  return transferWindowOpen() ? 'yes' : 'no';
}

// A repeat caller is recognized by caller ID: the name saved on the most
// recently updated contact with that phone number is returned at call start so
// the agent can greet them by name. A failed lookup never blocks the call.
export async function knownCallerName(
  db: SupabaseClient, tenantId: string, callerPhone: string,
): Promise<string> {
  const phone = normalizePhone(callerPhone);
  if (!phone) return '';
  try {
    const { data, error } = await db
      .from('ai4cc_contacts')
      .select('display_name')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return '';
    return cleanField(data?.display_name);
  } catch {
    return '';
  }
}

// The voice agent sometimes fills unknown fields with filler ("Unknown",
// "Not specified", "None stated") despite its instructions. Treat those as empty
// so they never become a lead title or a line in the lead description.
const PLACEHOLDER_RE = /^(?:unknown|n\/?a|none|none (?:specified|stated|given|provided|mentioned)|not (?:specified|stated|given|provided|mentioned|applicable|sure)|tbd)\.?$/i;

export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_RE.test(value.trim());
}

export function cleanField(value: unknown): string {
  const v = text(value);
  return isPlaceholder(v) ? '' : v;
}

// Drops "Label: <placeholder>" lines. "Objections: None" is kept, because the
// agent is told to write it only when it asked and the caller had none.
export function stripPlaceholderLines(description: string): string {
  return description
    .split('\n')
    .filter((line) => {
      const m = line.match(/^\s*([^:]{1,40}):\s*(.*)$/);
      if (!m) return true;
      const [, label, value] = m;
      if (/^objections$/i.test(label.trim()) && /^none\.?$/i.test(value.trim())) return true;
      return !isPlaceholder(value);
    })
    .join('\n')
    .trim();
}

// The intake RPC accepts one submission per call; a repeat returns the first
// lead unchanged. When a later submit carries an email or phone the saved
// contact is missing, fill only those empty fields so a detail the caller gave
// after the first save is not lost. Existing values are never overwritten.
export function missingContactFields(
  contact: { email?: string | null; phone?: string | null } | null | undefined,
  identifier: { email: string | null; phone: string | null },
): { email?: string; phone?: string } {
  if (!contact) return {};
  const patch: { email?: string; phone?: string } = {};
  if (!contact.email && identifier.email) patch.email = identifier.email;
  if (!contact.phone && identifier.phone) patch.phone = identifier.phone;
  return patch;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const action = text(body.action);

  try {
    const db = admin();

    const scope = await resolveScope(db, req);
    if (!scope) return res.status(401).json({ error: 'unauthorized' });
    const { tenantId, actorUserId } = scope;

    // ElevenLabs calls this before the agent speaks on an inbound phone call
    // (conversation initiation webhook) with caller_id, agent_id, called_number
    // and call_sid. The returned dynamic variables fill the first message.
    if (action === 'initiate' || (!action && typeof body.caller_id === 'string')) {
      const callerPhone = text(body.caller_id);
      const name = await knownCallerName(db, tenantId, callerPhone);
      return res.status(200).json({
        type: 'conversation_initiation_client_data',
        dynamic_variables: {
          known_caller_name: name,
          greeting_question: greetingQuestion(name),
          caller_number: formatCallerNumber(callerPhone),
        },
      });
    }

    if (action === 'start') {
      const callerPhone = text(body.callerPhone);
      const conversationId = text(body.conversationId);

      const { data, error } = await db
        .from('ai4cc_interactions')
        .insert({
          tenant_id: tenantId,
          channel: 'voice',
          direction: 'inbound',
          external_id: conversationId || null,
          customer_identifier: callerPhone || null,
          status: 'open',
          metadata: {
            source: 'elevenlabs_agent',
            agentName: 'AI4CC Business Intake Agent',
            elevenlabsConversationId: conversationId || null,
          },
        })
        .select('id')
        .single();

      if (error?.code === '23505' && conversationId) {
        // The unique constraint also handles simultaneous start requests.
        const { data: existing, error: lookupError } = await db
          .from('ai4cc_interactions')
          .select('id, metadata')
          .eq('tenant_id', tenantId)
          .eq('channel', 'voice')
          .eq('external_id', conversationId)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (existing?.metadata?.source === 'elevenlabs_agent') {
          return res.status(200).json({
            interactionId: existing.id,
            transferAllowed: transferAllowed(),
            knownCallerName: await knownCallerName(db, tenantId, callerPhone),
            callerNumber: formatCallerNumber(callerPhone),
          });
        }
        return res.status(409).json({ error: 'conversation ID is already in use' });
      }
      if (error) throw error;
      return res.status(201).json({
        interactionId: data.id,
        transferAllowed: transferAllowed(),
        knownCallerName: await knownCallerName(db, tenantId, callerPhone),
        callerNumber: formatCallerNumber(callerPhone),
      });
    }

    if (action === 'submit') {
      const interactionId = text(body.interactionId);
      if (!UUID_RE.test(interactionId)) return res.status(400).json({ error: 'interactionId is required' });

      const businessName = cleanField(body.businessName);
      const callerName = cleanField(body.callerName);
      const email = cleanField(body.email);
      const description = stripPlaceholderLines(text(body.description));
      const serviceInterest = cleanField(body.serviceInterest);

      const { data: interaction, error: fetchError } = await db
        .from('ai4cc_interactions')
        .select('id, status, metadata, customer_identifier')
        .eq('tenant_id', tenantId)
        .eq('id', interactionId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!interaction) return res.status(404).json({ error: 'interaction not found' });
      const phoneCandidate = callbackPhone(body.phone, interaction.customer_identifier);
      const identifier = classifyIdentifier(email, phoneCandidate);

      // The RPC locks the interaction and commits completion, contact, lead and
      // audit together. Failure leaves it retryable; replay returns the first lead.
      const { data: lifecycle, error: rpcError } = await db.rpc('ai4cc_submit_voice_intake', {
        p_tenant_id: tenantId,
        p_actor_user_id: actorUserId,
        p_interaction_id: interactionId,
        p_identifier_type: identifier.type,
        p_identifier_value: identifier.value,
        p_email: identifier.email,
        p_phone: identifier.phone,
        p_contact_name: callerName || businessName || identifier.value,
        p_company_name: businessName || null,
        p_service_interest: serviceInterest || null,
        p_description: description || 'Lead captured by the conversational agent.',
        p_metadata: { businessName, callerName, email, phone: phoneCandidate, description, serviceInterest },
      });

      if (rpcError) {
        if (rpcError.message?.includes('AI4CC_INTERACTION_NOT_FOUND')) return res.status(404).json({ error: 'interaction not found' });
        if (rpcError.message?.includes('AI4CC_INTAKE_INTERACTION_STATE_INVALID')) return res.status(409).json({ error: 'interaction cannot be submitted in this state' });
        if (rpcError.message?.includes('AI4CC_INTAKE_SOURCE_INVALID')) return res.status(409).json({ error: 'interaction is not a voice intake' });
        throw rpcError;
      }
      if (lifecycle?.replayed) {
        const contact = lifecycle.contact as { id?: string; email?: string | null; phone?: string | null } | null;
        const patch = missingContactFields(contact, identifier);
        const filled: string[] = [];
        for (const field of Object.keys(patch) as Array<'email' | 'phone'>) {
          // Guarded on the column still being empty, so a concurrent fill is never overwritten.
          const { data: updated, error: fillError } = await db
            .from('ai4cc_contacts')
            .update({ [field]: patch[field], updated_at: new Date().toISOString() })
            .eq('tenant_id', tenantId)
            .eq('id', contact!.id!)
            .is(field, null)
            .select('id');
          if (fillError) throw fillError;
          if (updated?.length) {
            filled.push(field);
            (lifecycle.contact as Record<string, unknown>)[field] = patch[field];
          }
        }
        return res.status(200).json(filled.length ? { ...lifecycle, filled } : lifecycle);
      }
      return res.status(201).json(lifecycle);
    }

    return res.status(400).json({ error: 'action must be "start" or "submit"' });
  } catch (error) {
    console.error('[intake] failed', error);
    return res.status(500).json({ error: 'Intake webhook failed' });
  }
}
