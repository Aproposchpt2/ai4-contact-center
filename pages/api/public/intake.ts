import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { normalizePhone } from '../intake/webhook';

// Public, no-auth intake form submission (see pages/intake.tsx). Minimum-friction by design:
// name, business name, phone, email only -- no qualification questions. Per
// "CUSTOMER ENGAGEMENT OPERATION CENTER Intake form.txt": qualification happens AFTER capture,
// in the private Sales Service assessment, not on this form.

const TENANT_ID = '5885a020-d363-4c27-910a-c035eda132f5';
// Same fallback as ../intake/webhook.ts and ../sms/webhook.ts -- must be an active tenant_users
// member of TENANT_ID. Override per environment with AI4CC_INTAKE_FALLBACK_ACTOR_ID.
const ACTOR_USER_ID = process.env.AI4CC_INTAKE_FALLBACK_ACTOR_ID || '735fc481-1b75-4cf3-9f68-128e9e169fdc';
const NOTIFY_EMAIL = 'jmitchell@aproposgroupllc.com';
const CLIENT_TOKEN_RE = /^[A-Za-z0-9_-]{8,80}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('AI4CC_STORAGE_NOT_CONFIGURED');
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function validateOrigin(req: NextApiRequest) {
  if (process.env.NODE_ENV !== 'production') return;
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host || new URL(origin).host !== host) throw new Error('Invalid intake origin');
}

function text(value: unknown, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function notifyOwner(name: string, businessName: string, phone: string, email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[intake] RESEND_API_KEY not configured; skipping owner notification email');
    return;
  }
  const from = process.env.RESEND_FROM_EMAIL || 'Apropos Group LLC <jmitchell@aproposgroupllc.com>';
  const to = process.env.RESEND_TO_EMAIL || NOTIFY_EMAIL;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `New StellarUC intake: ${businessName}`,
        text: `New website intake submitted.\n\nName: ${name}\nBusiness: ${businessName}\nPhone: ${phone}\nEmail: ${email}\n\nAlready in the workspace under Lead Management / Customer 360.`,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    // Best-effort: the lead is already safely stored. A failed notification email must not
    // fail the submission for the prospect.
    console.error('[intake] owner notification email failed', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    validateOrigin(req);
  } catch {
    return res.status(403).json({ error: 'Invalid request origin' });
  }

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = text(body.name);
    const businessName = text(body.businessName);
    const phoneRaw = text(body.phone, 40);
    const emailRaw = text(body.email).toLowerCase();
    const clientToken = text(body.clientToken, 80);

    if (!name) return res.status(400).json({ error: 'Name is required.' });
    if (!businessName) return res.status(400).json({ error: 'Business name is required.' });
    if (!EMAIL_RE.test(emailRaw)) return res.status(400).json({ error: 'A valid email address is required.' });
    const phone = normalizePhone(phoneRaw);
    if (!phone) return res.status(400).json({ error: 'A valid phone number is required.' });
    if (!CLIENT_TOKEN_RE.test(clientToken)) return res.status(400).json({ error: 'Invalid submission token.' });

    const db = admin();
    const now = new Date().toISOString();

    // Idempotent on (tenant_id, channel, external_id): clientToken is generated once per page
    // load (see pages/intake.tsx), so a double-click or network retry of the same submit
    // reuses the same interaction instead of creating a second lead.
    const { error: upsertError } = await db.from('ai4cc_interactions').upsert(
      {
        tenant_id: TENANT_ID,
        channel: 'email',
        direction: 'inbound',
        external_id: clientToken,
        customer_identifier: emailRaw,
        status: 'completed',
        started_at: now,
        ended_at: now,
        metadata: { source: 'stellaruc_demo_intake', name, businessName, phone, email: emailRaw },
      },
      { onConflict: 'tenant_id,channel,external_id', ignoreDuplicates: true },
    );
    if (upsertError) throw upsertError;

    const { data: interaction, error: fetchError } = await db
      .from('ai4cc_interactions')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('channel', 'email')
      .eq('external_id', clientToken)
      .single();
    if (fetchError) throw fetchError;

    const { data: existingLead, error: leadLookupError } = await db
      .from('ai4cc_leads')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('originating_interaction_id', interaction.id)
      .maybeSingle();
    if (leadLookupError) throw leadLookupError;

    if (!existingLead) {
      const { data: created, error: rpcError } = await db.rpc('ai4cc_create_lead_from_interaction', {
        p_tenant_id: TENANT_ID,
        p_actor_user_id: ACTOR_USER_ID,
        p_interaction_id: interaction.id,
        p_identifier_type: 'email',
        p_identifier_value: emailRaw,
        p_email: emailRaw,
        p_phone: phone,
        p_contact_name: name,
        p_company_name: businessName,
        p_title: 'Website intake',
        p_service_interest: null,
        p_description: `Website intake form submitted. Name: ${name}. Business: ${businessName}. Wants to be contacted to begin a Sales Service assessment.`,
        p_pipeline_stage: 'new',
        p_priority: 'normal',
        p_score: 50,
        p_estimated_value: 0,
        p_probability: 0,
        p_next_action: 'Contact to begin Sales Service assessment.',
        p_next_follow_up: null,
      });
      if (rpcError) throw rpcError;

      const leadId = (created as { lead?: { id?: string } } | null)?.lead?.id;
      if (leadId) {
        const { error: activityError } = await db.rpc('ai4cc_record_lead_activity', {
          p_tenant_id: TENANT_ID,
          p_actor_user_id: ACTOR_USER_ID,
          p_lead_id: leadId,
          p_activity_type: 'website_intake',
          p_direction: 'inbound',
          p_subject: 'Website intake form submitted',
          p_body: `Name: ${name}\nBusiness: ${businessName}\nPhone: ${phone}\nEmail: ${emailRaw}`,
          p_outcome: null,
        });
        if (activityError) throw activityError;
      }

      await notifyOwner(name, businessName, phone, emailRaw);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[intake] failed', error);
    return res.status(500).json({ error: 'We could not save your information. Please try again.' });
  }
}
