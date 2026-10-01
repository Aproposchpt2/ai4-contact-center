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

    // Idempotent on (tenant_id, channel, external_id): Twilio retries on a slow/odd response.
    const { error: interactionError } = await db.from('ai4cc_interactions').upsert(
      {
        tenant_id: TENANT_ID,
        channel: 'sms',
        direction: 'inbound',
        external_id: messageSid,
        customer_identifier: phone,
        status: 'open',
        metadata: { source: 'twilio_sms', to, body: text },
      },
      { onConflict: 'tenant_id,channel,external_id', ignoreDuplicates: true },
    );
    if (interactionError) throw interactionError;

    // Upsert-by-phone so a returning texter is recognized the same way a returning
    // caller already is (see knownCallerName in ../intake/webhook.ts).
    const { data: existingContact, error: lookupError } = await db
      .from('ai4cc_contacts')
      .select('id, metadata')
      .eq('tenant_id', TENANT_ID)
      .eq('phone', phone)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existingContact) {
      const { error: updateError } = await db
        .from('ai4cc_contacts')
        .update({
          updated_at: new Date().toISOString(),
          metadata: { ...(existingContact.metadata as object ?? {}), last_sms_body: text, last_sms_at: new Date().toISOString() },
        })
        .eq('id', existingContact.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await db.from('ai4cc_contacts').insert({
        tenant_id: TENANT_ID,
        display_name: phone,
        phone,
        lead_source: 'sms',
        sms_consent: true,
        metadata: { source: 'twilio_sms', last_sms_body: text, last_sms_at: new Date().toISOString() },
      });
      if (insertError) throw insertError;
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
