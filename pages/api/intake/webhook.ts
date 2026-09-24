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
const LEGACY_ACTOR_USER_ID = '54aade67-58be-4136-826c-b6c4f98adf6f';
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

function normalizePhone(value: string): string | null {
  const raw = value.trim();
  if (!raw || !/^[+\d().\-\s]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits;
}

function classifyIdentifier(rawEmail: unknown, rawPhone: unknown) {
  const email = text(rawEmail);
  const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && emailLike.test(email)) {
    return { type: 'email' as const, value: email, email: email.toLowerCase(), phone: null as string | null };
  }
  const phone = normalizePhone(text(rawPhone));
  if (phone) return { type: 'phone' as const, value: phone, email: null as string | null, phone };
  return { type: 'opaque' as const, value: email || text(rawPhone) || 'Unknown contact', email: null, phone: null };
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

      if (error) throw error;
      return res.status(201).json({ interactionId: data.id });
    }

    if (action === 'submit') {
      const interactionId = text(body.interactionId);
      if (!UUID_RE.test(interactionId)) return res.status(400).json({ error: 'interactionId is required' });

      const businessName = text(body.businessName);
      const callerName = text(body.callerName);
      const email = text(body.email);
      const phone = text(body.phone);
      const description = text(body.description);
      const serviceInterest = text(body.serviceInterest);

      const { data: interaction, error: fetchError } = await db
        .from('ai4cc_interactions')
        .select('id, status, metadata')
        .eq('tenant_id', tenantId)
        .eq('id', interactionId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!interaction) return res.status(404).json({ error: 'interaction not found' });
      if (interaction.status === 'completed') return res.status(409).json({ error: 'interaction already submitted' });

      const { error: updateError } = await db
        .from('ai4cc_interactions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          metadata: {
            ...(interaction.metadata as Record<string, unknown>),
            businessName,
            callerName,
            email,
            phone,
            description,
            serviceInterest,
          },
        })
        .eq('id', interactionId);
      if (updateError) throw updateError;

      const identifier = classifyIdentifier(email, phone);

      const { data: lifecycle, error: rpcError } = await db.rpc('ai4cc_create_lead_from_interaction', {
        p_tenant_id: tenantId,
        p_actor_user_id: actorUserId,
        p_interaction_id: interactionId,
        p_identifier_type: identifier.type,
        p_identifier_value: identifier.value,
        p_email: identifier.email,
        p_phone: identifier.phone,
        p_contact_name: callerName || businessName || identifier.value,
        p_company_name: businessName || null,
        p_title: businessName ? `${businessName} — voice intake` : 'Voice intake lead',
        p_service_interest: serviceInterest || null,
        p_description: description || 'Lead captured by the AI4CC Business Intake Agent.',
        p_pipeline_stage: 'new',
        p_priority: 'normal',
        p_score: 50,
        p_estimated_value: 0,
        p_probability: 0,
        p_next_action: 'Review intake call and follow up.',
        p_next_follow_up: null,
      });

      if (rpcError) throw rpcError;
      return res.status(201).json(lifecycle);
    }

    return res.status(400).json({ error: 'action must be "start" or "submit"' });
  } catch (error) {
    console.error('[intake] failed', error);
    return res.status(500).json({ error: 'Intake webhook failed' });
  }
}
