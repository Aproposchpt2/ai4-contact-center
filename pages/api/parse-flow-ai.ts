import type { NextApiRequest, NextApiResponse } from 'next';
import { parseCallFlow, ParsedCallFlow } from '@/lib/parser';

type ErrorResponse = { error: string };
type SuccessResponse = ParsedCallFlow & { engine: 'ai' | 'rules' };

const SYSTEM_PROMPT = `You are a Senior Contact Center Engineer specializing in IVR (Interactive Voice Response) design.
Your job is to parse a plain-English call flow description and return ONLY a valid JSON object — no markdown, no explanation, just the JSON.

The JSON must follow this exact schema:
{
  "menu": "string — top-level menu label",
  "options": [
    { "key": number, "label": "string", "queue": "string (label + _Queue, no spaces)" }
  ],
  "after_hours": "string or null",
  "holiday": "string or null",
  "schedule": null OR {
    "timezone": "IANA timezone string or null",
    "business_hours": [
      { "days": ["sun|mon|tue|wed|thu|fri|sat"], "start": "HH:mm", "end": "HH:mm" }
    ],
    "holiday_dates": ["YYYY-MM-DD"]
  }
}

Rules:
- Extract every numbered DTMF option (1, 2, 3…)
- queue = label with spaces removed + "_Queue" (e.g. "Financial Aid" → "FinancialAid_Queue")
- after_hours: if after-hours routing is mentioned, set to destination (e.g. "Voicemail_Main", "AfterHours_Queue"); null if not mentioned
- holiday: if holiday routing is mentioned, set to destination (e.g. "Holiday_Message"); null if not mentioned
- schedule MUST be null unless the caller explicitly supplies business hours and/or explicit holiday dates
- Never invent opening hours, closing hours, weekdays, timezone, or holiday dates
- Convert explicitly authored business hours to 24-hour HH:mm values
- Use only explicit IANA timezone names when supplied; otherwise set schedule.timezone to null
- holiday_dates may contain only explicitly supplied ISO YYYY-MM-DD dates
- Return ONLY the JSON object. No prose. No backticks.`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { text } = req.body as { text?: string };
  if (!text?.trim()) return res.status(400).json({ error: 'text field is required' });

  const apiKey = process.env.OPENAI_API_KEY;

  // ── AI path ──────────────────────────────────────────────────────────────
  if (apiKey) {
    try {
      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 1000,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: text.trim()   },
          ],
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json() as {
          choices: Array<{ message: { content: string } }>;
        };
        const raw = aiData.choices?.[0]?.message?.content?.trim() ?? '';
        try {
          const parsed = JSON.parse(raw) as ParsedCallFlow;
          if (parsed.schedule === undefined) parsed.schedule = null;
          return res.status(200).json({ ...parsed, engine: 'ai' });
        } catch {
          console.warn('[parse-flow-ai] JSON parse failed, falling back to rules. Raw:', raw);
        }
      } else {
        console.warn('[parse-flow-ai] OpenAI error', aiRes.status);
      }
    } catch (err) {
      console.warn('[parse-flow-ai] fetch error, falling back to rules:', err);
    }
  }

  // ── Rule-based fallback ───────────────────────────────────────────────────
  const result = parseCallFlow(text.trim());
  return res.status(200).json({ ...result, engine: 'rules' });
}
