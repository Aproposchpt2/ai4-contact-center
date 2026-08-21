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

export type ScheduleDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface BusinessHoursWindow {
  days: ScheduleDay[];
  start: string; // HH:mm, local to schedule timezone
  end: string;   // HH:mm, local to schedule timezone
}

export interface CallFlowSchedule {
  timezone: string | null;
  business_hours: BusinessHoursWindow[];
  holiday_dates: string[]; // ISO YYYY-MM-DD values only
}

export interface ParsedCallFlow {
  menu: string;
  options: CallFlowOption[];
  after_hours: string | null;
  holiday: string | null;
  schedule?: CallFlowSchedule | null;
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
 * Returns "Voicemail_Main" if voicemail mentioned.
 */
export function extractAfterHours(text: string): string | null {
  if (!/after[-\s]?hours/i.test(text)) return null;
  if (/voicemail/i.test(text)) return 'Voicemail_Main';
  return null;
}

/**
 * Detect holiday routing.
 * Returns "Holiday_Message" if message mentioned.
 */
export function extractHoliday(text: string): string | null {
  if (!/holidays?/i.test(text)) return null;
  if (/message/i.test(text)) return 'Holiday_Message';
  return null;
}

const DAY_MAP: Record<string, ScheduleDay> = {
  sunday: 'sun', sun: 'sun',
  monday: 'mon', mon: 'mon',
  tuesday: 'tue', tue: 'tue', tues: 'tue',
  wednesday: 'wed', wed: 'wed',
  thursday: 'thu', thu: 'thu', thur: 'thu', thurs: 'thu',
  friday: 'fri', fri: 'fri',
  saturday: 'sat', sat: 'sat',
};

const DAY_ORDER: ScheduleDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function parseDays(value: string): ScheduleDay[] {
  const normalized = value.toLowerCase().replace(/\bthrough\b|\bthru\b|\bto\b/g, '-');
  const range = normalized.match(/([a-z]+)\s*-\s*([a-z]+)/i);
  if (range) {
    const start = DAY_MAP[range[1]];
    const end = DAY_MAP[range[2]];
    if (start && end) {
      const startIndex = DAY_ORDER.indexOf(start);
      const endIndex = DAY_ORDER.indexOf(end);
      if (startIndex <= endIndex) return DAY_ORDER.slice(startIndex, endIndex + 1);
      return [...DAY_ORDER.slice(startIndex), ...DAY_ORDER.slice(0, endIndex + 1)];
    }
  }

  const days = normalized
    .split(/[,/\s]+/)
    .map((part) => DAY_MAP[part])
    .filter((day): day is ScheduleDay => Boolean(day));
  return Array.from(new Set(days));
}

function normalizeClock(hourRaw: string, minuteRaw: string | undefined, meridiemRaw: string | undefined) {
  let hour = Number(hourRaw);
  const minute = Number(minuteRaw ?? '0');
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  const meridiem = meridiemRaw?.toLowerCase();
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Extract an optional schedule only when explicit temporal rules are authored.
 * Supported rule fallback examples:
 * - "Timezone America/Los_Angeles. Business hours Monday-Friday 09:00-17:00."
 * - "Business hours Monday through Friday 9 AM to 5 PM."
 * - "Holiday dates: 2026-12-25, 2027-01-01."
 * If no explicit hours/dates are present, returns null so legacy flows preserve current behavior.
 */
export function extractSchedule(text: string): CallFlowSchedule | null {
  const timezoneMatch = text.match(/timezone\s*[:=-]?\s*([A-Za-z_]+\/[A-Za-z_+-]+)/i);
  const timezone = timezoneMatch?.[1] ?? null;

  const businessHours: BusinessHoursWindow[] = [];
  const hoursPattern = /business\s+hours?\s*[:=-]?\s*([A-Za-z,\/\s-]+?)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|through)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
  let hoursMatch: RegExpExecArray | null;
  while ((hoursMatch = hoursPattern.exec(text)) !== null) {
    const days = parseDays(hoursMatch[1]);
    const start = normalizeClock(hoursMatch[2], hoursMatch[3], hoursMatch[4]);
    const end = normalizeClock(hoursMatch[5], hoursMatch[6], hoursMatch[7]);
    if (days.length > 0 && start && end) businessHours.push({ days, start, end });
  }

  const holidayDates = Array.from(new Set(
    [...text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((match) => match[1])
  ));
  const explicitlyHolidayDates = /holiday\s+dates?/i.test(text) ? holidayDates : [];

  if (businessHours.length === 0 && explicitlyHolidayDates.length === 0) return null;
  return {
    timezone,
    business_hours: businessHours,
    holiday_dates: explicitlyHolidayDates,
  };
}

/** Master parser — runs all extractors and returns a full ParsedCallFlow. */
export function parseCallFlow(text: string): ParsedCallFlow {
  return {
    menu:        extractMenu(text),
    options:     extractOptions(text),
    after_hours: extractAfterHours(text),
    holiday:     extractHoliday(text),
    schedule:    extractSchedule(text),
  };
}
