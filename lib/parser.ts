/**
 * parser.ts
 * Rule-based call flow parser for AI4 Contact Center – AI Script Builder MVP.
 * All functions accept raw natural-language text and return structured values.
 */

export interface CallFlowOption {
  key: number;
  label: string;
  queue: string;
}

export interface ParsedCallFlow {
  menu: string;
  options: CallFlowOption[];
  after_hours: string | null;
  holiday: string | null;
}

/** Detect menu name using spec rules. */
export function extractMenu(text: string): string {
  if (/main\s+menu/i.test(text)) return 'Main Menu';

  const match = text.match(/menu\s*[:-]\s*([^\n.]+)/i);
  if (match && match[1].trim()) return match[1].trim();

  return 'Main Menu';
}

/**
 * Extract numbered DTMF options.
 * Matches patterns like: "1 for Admissions", "Press 2 for Financial Aid"
 */
export function extractOptions(text: string): CallFlowOption[] {
  const pattern = /(?:press\s+)?(\d+)\s+for\s+([A-Za-z &]+?)(?=[,.]|and\s|\d+\s+for|$)/gi;
  const options: CallFlowOption[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const label = match[2].trim();
    options.push({
      key:   parseInt(match[1], 10),
      label: label,
      queue: `${label.replace(/\s+/g, '')}_Queue`,
    });
  }
  return options;
}

/**
 * Detect after-hours routing.
 * Returns "Voicemail_Main" if voicemail mentioned, otherwise "AfterHours_Default".
 */
export function extractAfterHours(text: string): string | null {
  if (!/after[-\s]?hours/i.test(text)) return null;
  if (/voicemail/i.test(text)) return 'Voicemail_Main';
  return null;
}

/**
 * Detect holiday routing.
 * Returns "Holiday_Message" if message mentioned, otherwise "Holiday_Default".
 */
export function extractHoliday(text: string): string | null {
  if (!/holidays?/i.test(text)) return null;
  if (/message/i.test(text)) return 'Holiday_Message';
  return null;
}

/** Master parser — runs all extractors and returns a full ParsedCallFlow. */
export function parseCallFlow(text: string): ParsedCallFlow {
  return {
    menu:        extractMenu(text),
    options:     extractOptions(text),
    after_hours: extractAfterHours(text),
    holiday:     extractHoliday(text),
  };
}
