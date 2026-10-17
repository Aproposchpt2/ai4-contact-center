import type { NextApiRequest, NextApiResponse } from 'next';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

// Staging-only TwiML endpoint — routes calls to the Railway staging bridge.
// Uses TWILIO_BRIDGE_WS_URL_STAGING + BRIDGE_HMAC_SECRET_STAGING env vars so
// production routing is completely untouched.

const STAGING_BRIDGE_WS_URL = 'wss://stellaruc-voice-bridge-staging-staging.up.railway.app/ws';
const TOKEN_TTL_SECS = 120;

function makeSay(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${message}</Say></Response>`;
}

function mintToken(profile: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(8).toString('hex');
  const payload = `${profile}:${ts}:${nonce}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

function parseBody(raw: unknown): Record<string, string> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  if (typeof raw === 'string') {
    const out: Record<string, string> = {};
    for (const pair of raw.split('&')) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      out[decodeURIComponent(pair.slice(0, idx).replace(/\+/g, ' '))] =
        decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
    }
    return out;
  }
  return {};
}

function validateTwilioSignature(req: NextApiRequest, authToken: string): boolean {
  const signature = req.headers['x-twilio-signature'];
  if (!signature || typeof signature !== 'string') return false;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || '';
  const fullUrl = `${proto}://${host}${req.url ?? ''}`;
  const params = parseBody(req.body);
  const sortedStr = Object.keys(params).sort().reduce((acc, k) => acc + k + (params[k] ?? ''), '');
  const expected = createHmac('sha1', authToken).update(fullUrl + sortedStr).digest();
  try {
    const sigBuf = Buffer.from(signature, 'base64');
    if (expected.length !== sigBuf.length) return false;
    return timingSafeEqual(expected, sigBuf);
  } catch {
    return false;
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken && !validateTwilioSignature(req, authToken)) {
    return res.status(200).send(makeSay('We could not verify your call. Please try again.'));
  }

  const profile = String(req.query.profile || '');
  if (profile !== 'sales' && profile !== 'support') {
    return res.status(400).send(makeSay('Invalid profile.'));
  }

  // Staging bridge URL: env var overrides hardcoded default
  const bridgeWsUrl = (process.env.TWILIO_BRIDGE_WS_URL_STAGING || STAGING_BRIDGE_WS_URL).replace(/\/$/, '');
  const hmacSecret = process.env.BRIDGE_HMAC_SECRET_STAGING;

  if (!hmacSecret) {
    return res.status(200).send(makeSay('Staging bridge is not configured. Please contact the development team.'));
  }

  const token = mintToken(profile, hmacSecret);
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${bridgeWsUrl}/${profile}">
      <Parameter name="bridge_token" value="${token}"/>
    </Stream>
  </Connect>
  <Hangup/>
</Response>`;
  return res.status(200).send(twiml);
}
