import type { NextApiRequest, NextApiResponse } from 'next';
import { apiErrorMessage, apiErrorStatus, requireAi4ccContext } from '@/lib/ai4ccServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { admin, tenantId } = await requireAi4ccContext(req);

    if (req.method === 'GET') {
      const { data, error } = await admin
        .from('ai4cc_voicemail_messages')
        .select('id,interaction_id,call_sid,recording_sid,recording_url,caller_identifier,duration_seconds,transcription,transcription_status,callback_status,received_at,reviewed_at,resolved_at,metadata,assigned_queue_id,assigned_agent_id,destination_id,destination_version_id')
        .eq('tenant_id', tenantId)
        .order('received_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return res.status(200).json({ voicemails: data ?? [] });
    }

    if (req.method === 'PUT') {
      const id = typeof req.body?.id === 'string' ? req.body.id : '';
      const status = typeof req.body?.callback_status === 'string' ? req.body.callback_status : '';
      if (!id || !['new','reviewed','callback_pending','resolved'].includes(status)) {
        return res.status(400).json({ error: 'id and valid callback_status are required' });
      }
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { callback_status: status, updated_at: now };
      if (status === 'reviewed') patch.reviewed_at = now;
      if (status === 'resolved') patch.resolved_at = now;
      const { data, error } = await admin
        .from('ai4cc_voicemail_messages')
        .update(patch)
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return res.status(200).json({ voicemail: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
