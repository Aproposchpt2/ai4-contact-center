import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Public, read-only, no-auth endpoint for the homepage's live call-proof widget.
// Deliberately returns only the minimal fields needed for that demo — never the
// full interaction/lead row, never internal ids beyond what's harmless to show.
// This is intentional public exposure of the most recent real (or test) call to
// the AI4CC Business Intake Agent, by design — see pages/index.tsx's proof section.

const TENANT_ID = '5885a020-d363-4c27-910a-c035eda132f5';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');

  try {
    const db = admin();

    const { data: interaction, error } = await db
      .from('ai4cc_interactions')
      .select('id, status, customer_identifier, metadata, started_at, ended_at')
      .eq('tenant_id', TENANT_ID)
      .eq('channel', 'voice')
      .eq('status', 'completed')
      .contains('metadata', { source: 'elevenlabs_agent' })
      .not('metadata->>callerName', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!interaction) return res.status(200).json({ call: null });

    const { data: lead } = await db
      .from('ai4cc_leads')
      .select('pipeline_stage')
      .eq('originating_interaction_id', interaction.id)
      .maybeSingle();

    const meta = (interaction.metadata ?? {}) as Record<string, unknown>;

    return res.status(200).json({
      call: {
        callerName: (meta.callerName as string) || null,
        businessName: (meta.businessName as string) || null,
        phone: (meta.phone as string) || interaction.customer_identifier || null,
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
