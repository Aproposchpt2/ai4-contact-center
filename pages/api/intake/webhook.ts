import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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

// Single-tenant today: Apropos Group LLC is the only row in ai4cc_tenants.
const TENANT_ID = '5885a020-d363-4c27-910a-c035eda132f5';
// System-attributed actor for leads created outside a logged-in session (ai4cc_tenant_members owner).
const SYSTEM_ACTOR_USER_ID = '54aade67-58be-4136-826c-b6c4f98adf6f';

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('AI4CC_STORAGE_NOT_CONFIGURED');
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
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

    if (action === 'start') {
      const callerPhone = text(body.callerPhone);
      const conversationId = text(body.conversationId);

      const { data, error } = await db
        .from('ai4cc_interactions')
        .insert({
          tenant_id: TENANT_ID,
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
      if (!interactionId) return res.status(400).json({ error: 'interactionId is required' });

      const businessName = text(body.businessName);
      const callerName = text(body.callerName);
      const email = text(body.email);
      const phone = text(body.phone);
      const description = text(body.description);
      const serviceInterest = text(body.serviceInterest);

      const { data: interaction, error: fetchError } = await db
        .from('ai4cc_interactions')
        .select('id, metadata')
        .eq('tenant_id', TENANT_ID)
        .eq('id', interactionId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!interaction) return res.status(404).json({ error: 'interaction not found' });

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
        p_tenant_id: TENANT_ID,
        p_actor_user_id: SYSTEM_ACTOR_USER_ID,
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
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Intake webhook failed' });
  }
}
