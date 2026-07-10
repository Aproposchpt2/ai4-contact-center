import type { NextApiRequest, NextApiResponse } from 'next';
import {
  extractMenu,
  extractOptions,
  extractAfterHours,
  extractHoliday,
  ParsedCallFlow,
} from '@/lib/parser';

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParsedCallFlow | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { text } = req.body as { text?: string };

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text field is required' });
  }

  const input = text.trim();
  const result = {
    menu: extractMenu(input),
    options: extractOptions(input),
    after_hours: extractAfterHours(input),
    holiday: extractHoliday(input),
  };
  return res.status(200).json(result);
}
