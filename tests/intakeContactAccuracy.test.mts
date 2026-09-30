import test from 'node:test';
import assert from 'node:assert/strict';
import { collapseSpelledOutLocalPart, classifyIdentifier, normalizePhone } from '../pages/api/intake/webhook.ts';

test('collapses a letter-by-letter spelled-out local part', () => {
  assert.equal(collapseSpelledOutLocalPart('j-m-i-t-c-h-e-l-l@aproposgroupllc.com'), 'jmitchell@aproposgroupllc.com');
  assert.equal(collapseSpelledOutLocalPart('a-b-c-d@example.com'), 'abcd@example.com');
});

test('leaves genuinely hyphenated addresses alone', () => {
  assert.equal(collapseSpelledOutLocalPart('mary-jane@example.com'), 'mary-jane@example.com');
  assert.equal(collapseSpelledOutLocalPart('a-b@example.com'), 'a-b@example.com'); // only 2 segments, under threshold
  assert.equal(collapseSpelledOutLocalPart('jmitchell@example.com'), 'jmitchell@example.com');
});

test('leaves non-email strings and malformed input alone', () => {
  assert.equal(collapseSpelledOutLocalPart(''), '');
  assert.equal(collapseSpelledOutLocalPart('not-an-email'), 'not-an-email');
  assert.equal(collapseSpelledOutLocalPart('@no-local-part.com'), '@no-local-part.com');
});

test('classifyIdentifier preserves phone alongside a valid email', () => {
  const id = classifyIdentifier('jmitchell@aproposgroupllc.com', '+15551234567');
  assert.equal(id.type, 'email');
  assert.equal(id.email, 'jmitchell@aproposgroupllc.com');
  assert.equal(id.phone, '+15551234567');
});

test('classifyIdentifier recovers a spelled-out email and still keeps phone', () => {
  const id = classifyIdentifier('j-m-i-t-c-h-e-l-l@aproposgroupllc.com', '5551234567');
  assert.equal(id.email, 'jmitchell@aproposgroupllc.com');
  assert.equal(id.phone, '+15551234567');
});

test('classifyIdentifier falls back to phone-only when no email is present', () => {
  const id = classifyIdentifier('', '5551234567');
  assert.equal(id.type, 'phone');
  assert.equal(id.value, '+15551234567');
  assert.equal(id.email, null);
});

test('classifyIdentifier falls back to opaque when neither is usable', () => {
  const id = classifyIdentifier('not-an-email', 'abc');
  assert.equal(id.type, 'opaque');
  assert.equal(id.email, null);
  assert.equal(id.phone, null);
});

test('normalizePhone still rejects garbage (sanity check, unchanged behavior)', () => {
  assert.equal(normalizePhone('abc'), null);
  assert.equal(normalizePhone('5551234567'), '+15551234567');
});

test('recovers the production retest email with spelled-out local and domain', () => {
  const id = classifyIdentifier('J-M-I-T-C-H-E-L-L@A-P-R-O-P-O-S-G-R-O-U-P-L-L-C.com', '+17023087429');
  assert.equal(id.type, 'email');
  assert.equal(id.email, 'jmitchell@aproposgroupllc.com');
  assert.equal(id.phone, '+17023087429');
});

test('recovers domain-only spelling and keeps dotted label boundaries', () => {
  assert.equal(collapseSpelledOutLocalPart('jeff@a-p-r-o-p-o-s-g-r-o-u-p-l-l-c.com'), 'jeff@aproposgroupllc.com');
  assert.equal(collapseSpelledOutLocalPart('jeff@s-a-l-e-s.example.co.uk'), 'jeff@sales.example.co.uk');
});

test('preserves ordinary hyphenated domains and mixed spelling', () => {
  for (const email of ['mary-jane@apropos-group-llc.com', 'jeff@a-b.com', 'jeff@a-b-c.com', 'jeff@my-a-b-c-d.com', 'jeff@xn--bcher-kva.de']) {
    assert.equal(collapseSpelledOutLocalPart(email), email);
  }
});

test('does not rewrite malformed multi-at input', () => {
  assert.equal(collapseSpelledOutLocalPart('a-b-c-d@a-b-c-d@domain.com'), 'a-b-c-d@a-b-c-d@domain.com');
});

test('email spelling recovery is idempotent', () => {
  const once = collapseSpelledOutLocalPart('J-M-I-T-C-H-E-L-L@A-P-R-O-P-O-S-G-R-O-U-P-L-L-C.com');
  assert.equal(collapseSpelledOutLocalPart(once), once);
});
