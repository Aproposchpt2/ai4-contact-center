import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Public, no-auth proof for /demo: shows a caller their own call, never a stranger's.
// The visitor must supply the last 4 digits of the number they called from; only a
// completed call from the last hour (or since their demo session began) with a matching
// number is returned, and even then the name is cut to a first name and the number masked.

const TENANT_ID = '5885a020-d363-4c27-910a-c035eda132f5';
const DEMO_SESSION_COOKIE = 'ai4cc_demo_started_at';
const LOOKBACK_MS = 60 * 60 * 1000;
const MAX_CANDIDATES = 50;

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('AI4CC_STORAGE_NOT_CONFIGURED');
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function durationLabel(startedAt: string, endedAt: string | null) {
  if (!endedAt) return null;
  const seconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds} sec`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
}

function validDemoSessionStart(value: string | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;

  const ageMs = Date.now() - timestamp;
  if (ageMs < 0 || ageMs > LOOKBACK_MS) return null;
  return new Date(timestamp).toISOString();
}

function lastFourDigits(value: unknown) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function firstName(value: unknown) {
  if (typeof value !== 'string') return null;
  return value.trim().split(/\s+/)[0] || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  res.setHeader('Cache-Control', 'private, no-store');

  const last4 = typeof req.query.last4 === 'string' ? req.query.last4 : '';
  if (!/^\d{4}$/.test(last4)) return res.status(400).json({ error: 'Enter the last 4 digits of the phone you called from' });

  const since = validDemoSessionStart(req.cookies[DEMO_SESSION_COOKIE]) ?? new Date(Date.now() - LOOKBACK_MS).toISOString();

  try {
    const db = admin();

    const { data: interactions, error } = await db
      .from('ai4cc_interactions')
      .select('id, status, customer_identifier, metadata, started_at, ended_at')
      .eq('tenant_id', TENANT_ID)
      .eq('channel', 'voice')
      .eq('status', 'completed')
      .contains('metadata', { source: 'elevenlabs_agent' })
      .not('metadata->>callerName', 'is', null)
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(MAX_CANDIDATES);

    if (error) throw error;

    const interaction = (interactions ?? []).find((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      return lastFourDigits(meta.phone) === last4 || lastFourDigits(row.customer_identifier) === last4;
    });
    if (!interaction) return res.status(200).json({ call: null });

    const { data: lead } = await db
      .from('ai4cc_leads')
      .select('pipeline_stage')
      .eq('originating_interaction_id', interaction.id)
      .maybeSingle();

    const meta = (interaction.metadata ?? {}) as Record<string, unknown>;

    return res.status(200).json({
      call: {
        callerName: firstName(meta.callerName),
        businessName: (meta.businessName as string) || null,
        phone: `(•••) •••-${last4}`,
        description: (meta.description as string) || null,
        serviceInterest: (meta.serviceInterest as string) || null,
        duration: durationLabel(interaction.started_at, interaction.ended_at),
        leadStage: lead?.pipeline_stage || null,
        capturedAt: interaction.started_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'latest-call failed' });
  }
}
