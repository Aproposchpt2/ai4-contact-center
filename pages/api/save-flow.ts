import type { NextApiRequest, NextApiResponse } from 'next';

type Body   = { name?: string; text?: string; parsed?: object };
type Result = { ok: true } | { error: string };

/**
 * POST /api/save-flow
 * Validates input and returns ok:true — actual persistence is client-side (localStorage).
 * Extend this route to write to Supabase / SQLite for server-side persistence.
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Result>
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { name, text, parsed } = req.body as Body;
  if (!text || !parsed) return res.status(400).json({ error: 'text and parsed are required' });

  // TODO: persist to Supabase or SQLite here when upgrading from MVP
  console.log('[save-flow] received:', { name: name ?? 'Untitled', textLength: text.length });

  return res.status(200).json({ ok: true });
}
