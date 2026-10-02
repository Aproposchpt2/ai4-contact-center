import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { normalizePhone } from '../intake/webhook';

// Twilio inbound-SMS webhook for the AI4 Contact Center production line.
// Twilio POSTs application/x-www-form-urlencoded (From/To/Body/MessageSid), not JSON --
// Next.js API routes parse that body type automatically, same as JSON.
//
// There is currently exactly one active tenant (Apropos Group LLC), and no
// phone-number-to-tenant mapping table exists yet (ai4cc_sites is unpopulated).
// Hardcode to that tenant, matching the same fallback pattern already used by
// ../intake/webhook.ts's LEGACY_TENANT_ID. Before a second tenant is onboarded,
// this must be replaced with a real lookup of `To` against an owned-number table.
const TENANT_ID = '5885a020-d363-4c27-910a-c035eda132f5';

// Same fallback actor as ../intake/webhook.ts's LEGACY_ACTOR_USER_ID -- must be an active
// tenant_users member of TENANT_ID. Override per environment with AI4CC_INTAKE_FALLBACK_ACTOR_ID
// rather than editing this default.
const ACTOR_USER_ID = process.env.AI4CC_INTAKE_FALLBACK_ACTOR_ID || '735fc481-1b75-4cf3-9f68-128e9e169fdc';

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('AI4CC_STORAGE_NOT_CONFIGURED');
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// https://www.twilio.com/docs/usage/webhooks/webhooks-security -- sort the POST params,
// append each key+value to the full request URL, HMAC-SHA1 with the auth token, base64 it,
// and compare to the X-Twilio-Signature header. Skips (with a warning) when no auth token is
// configured yet, mirroring the intake webhook's own ALLOW_UNKEYED fallback.
function validTwilioSignature(req: NextApiRequest, body: Record<string, unknown>): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn('[sms-webhook] TWILIO_AUTH_TOKEN not configured; accepting unsigned request');
    return true;
  }
  const signature = req.headers['x-twilio-signature'];
  if (typeof signature !== 'string') return false;

  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) || 'https';
  const host = req.headers.host;
  const url = `${proto}://${host}${req.url}`;

  const data = Object.keys(body)
    .sort()
    .reduce((acc, key) => acc + key + String(body[key] ?? ''), url);

  const expected = createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('POST only');

  const body = (req.body ?? {}) as Record<string, unknown>;

  if (!validTwilioSignature(req, body)) {
    console.error('[sms-webhook] invalid Twilio signature');
    return res.status(403).send('Forbidden');
  }

  try {
    const from = typeof body.From === 'string' ? body.From : '';
    const to = typeof body.To === 'string' ? body.To : '';
    const text = typeof body.Body === 'string' ? body.Body.trim().slice(0, 2000) : '';
    const messageSid = typeof body.MessageSid === 'string' ? body.MessageSid : '';
    const phone = normalizePhone(from);

    if (!messageSid || !phone) {
      console.error('[sms-webhook] missing MessageSid or unparseable From number', { from, messageSid });
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(EMPTY_TWIML);
    }

    const db = admin();
    const now = new Date().toISOString();

    // Idempotent on (tenant_id, channel, external_id): Twilio retries on a slow/odd response.
    // status must be 'completed' -- ai4cc_create_lead_from_interaction below requires it.
    const { error: upsertError } = await db.from('ai4cc_interactions').upsert(
      {
        tenant_id: TENANT_ID,
        channel: 'sms',
        direction: 'inbound',
        external_id: messageSid,
        customer_identifier: phone,
        status: 'completed',
        started_at: now,
        ended_at: now,
        metadata: { source: 'twilio_sms', to, body: text },
      },
      { onConflict: 'tenant_id,channel,external_id', ignoreDuplicates: true },
    );
    if (upsertError) throw upsertError;

    const { data: interaction, error: fetchError } = await db
      .from('ai4cc_interactions')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('channel', 'sms')
      .eq('external_id', messageSid)
      .single();
    if (fetchError) throw fetchError;

    // Idempotent on the interaction, not just the upsert above: a Twilio retry after a slow
    // (but successful) first response would otherwise create a second lead for the same text.
    const { data: existingLead, error: leadLookupError } = await db
      .from('ai4cc_leads')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('originating_interaction_id', interaction.id)
      .maybeSingle();
    if (leadLookupError) throw leadLookupError;

    if (!existingLead) {
      // Creates (or reuses, by phone) the contact and always creates a fresh lead -- same
      // shape as every voice call via ai4cc_submit_voice_intake. A back-and-forth texter
      // getting one lead per message matches that existing convention rather than inventing
      // a different one here.
      const { data: created, error: rpcError } = await db.rpc('ai4cc_create_lead_from_interaction', {
        p_tenant_id: TENANT_ID,
        p_actor_user_id: ACTOR_USER_ID,
        p_interaction_id: interaction.id,
        p_identifier_type: 'phone',
        p_identifier_value: phone,
        p_email: null,
        p_phone: phone,
        p_contact_name: null,
        p_company_name: null,
        p_title: null,
        p_service_interest: null,
        p_description: text || 'Inbound text with no message body.',
        p_pipeline_stage: 'new',
        p_priority: 'normal',
        p_score: 50,
        p_estimated_value: 0,
        p_probability: 0,
        p_next_action: 'Review inbound text and reply.',
        p_next_follow_up: null,
      });
      if (rpcError) throw rpcError;

      // The RPC's own activity row records "Lead created", not the message itself. Record the
      // actual text as a second activity so it renders in the Customer 360 Activity Timeline,
      // which reads activity.body -- ai4cc_interactions.metadata.body is never surfaced there.
      const leadId = (created as { lead?: { id?: string } } | null)?.lead?.id;
      if (leadId) {
        const { error: activityError } = await db.rpc('ai4cc_record_lead_activity', {
          p_tenant_id: TENANT_ID,
          p_actor_user_id: ACTOR_USER_ID,
          p_lead_id: leadId,
          p_activity_type: 'sms',
          p_direction: 'inbound',
          p_subject: 'Inbound SMS',
          p_body: text || null,
          p_outcome: null,
        });
        if (activityError) throw activityError;
      }
    }

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(EMPTY_TWIML);
  } catch (error) {
    console.error('[sms-webhook] failed', error);
    res.setHeader('Content-Type', 'text/xml');
    // Still 200 + empty TwiML: a 500 makes Twilio retry the same inbound message repeatedly.
    return res.status(200).send(EMPTY_TWIML);
  }
}
