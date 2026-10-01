import test from 'node:test';
import assert from 'node:assert/strict';
import { transferWindowOpen } from '../pages/api/intake/webhook.ts';

// Instants are given in UTC; the window is Monday–Friday 8 AM–6 PM Pacific.
const at = (iso: string) => transferWindowOpen(new Date(iso));

test('open on a weekday inside 8 AM–6 PM Pacific (daylight time, UTC-7)', () => {
  assert.equal(at('2026-09-30T15:00:00Z'), true);  // Wed 8:00 AM PDT
  assert.equal(at('2026-09-30T21:38:00Z'), true);  // Wed 2:38 PM PDT
  assert.equal(at('2026-10-01T00:59:00Z'), true);  // Wed 5:59 PM PDT
});

test('closed before 8 AM and from 6 PM Pacific', () => {
  assert.equal(at('2026-09-30T14:59:00Z'), false); // Wed 7:59 AM PDT
  assert.equal(at('2026-10-01T01:00:00Z'), false); // Wed 6:00 PM PDT
  assert.equal(at('2026-10-01T02:56:00Z'), false); // Wed 7:56 PM PDT (the 2026-09-30 after-hours test)
});

test('closed all weekend in Pacific time, even when UTC is already Monday', () => {
  assert.equal(at('2026-10-03T19:00:00Z'), false); // Sat 12:00 PM PDT
  assert.equal(at('2026-10-05T02:00:00Z'), false); // Sun 7:00 PM PDT = Mon 02:00 UTC
});

test('follows standard time (UTC-8) after daylight saving ends', () => {
  assert.equal(at('2026-11-02T16:00:00Z'), true);  // Mon 8:00 AM PST
  assert.equal(at('2026-11-02T15:30:00Z'), false); // Mon 7:30 AM PST
  assert.equal(at('2026-11-03T01:59:00Z'), true);  // Mon 5:59 PM PST
  assert.equal(at('2026-11-03T02:00:00Z'), false); // Mon 6:00 PM PST
});
