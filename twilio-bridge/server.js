'use strict';

const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { WebSocket, WebSocketServer } = require('ws');
const { readiness: supportWriteReadiness, submitStagingSupport } = require('./staging-support-intake.cjs');

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8080', 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BRIDGE_HMAC_SECRET = process.env.BRIDGE_HMAC_SECRET;
const AI4CC_INTAKE_KEY = process.env.AI4CC_INTAKE_KEY;
const NETLIFY_BASE_URL = (process.env.NETLIFY_BASE_URL || 'https://stellaruc.com').replace(/\/$/, '');
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const LIVE_MODEL = process.env.OPENAI_LIVE_MODEL || 'gpt-live-1';
const REASONING_MODEL = process.env.OPENAI_REASONING_MODEL || 'gpt-5.6-terra';
// Explicit staging mode also follows Railway's isolated environment name.
const STAGING_ONLY = process.env.STELLAR_BRIDGE_STAGING === 'true' || process.env.RAILWAY_ENVIRONMENT_NAME === 'staging';
// Stellar Technologies Support Desk — greeting and intake flow per owner direction.
const APPROVED_SUPPORT_INSTRUCTIONS = "You are the Stellar UC Intelligent Customer Product Support Desk representative in an ISOLATED TEST. This is a fictional customer-support intake simulation. Be warm, concise, attentive, and professional. Introduce yourself as the Support Desk, not the Sales Specialist. Ask one question at a time. Obtain a fictional customer's name, phone, email, product model, purchase date, problem description, steps already tried, and business impact. Ask sensible non-destructive diagnostic questions, avoid repeating attempted steps, classify urgency based on impact, and summarize all captured information clearly. After gathering and confirming fictional intake details, call submit_support_intake once. Wait for its result. State a case was created only if the tool returns success with customerId and caseId. If unavailable or unsuccessful, explain no case was confirmed. Never invent a case number, send a message, book a callback, or contact staff. Do not invent support policies, warranty coverage, product specifications, technical fixes, or response-time guarantees. Avoid collecting payment information, passwords, or other sensitive data. For potentially dangerous electrical or hardware issues advise the caller to stop using the device and contact qualified support. When asked whether records were created, rely exclusively on the actual submit_support_intake tool response; never claim a write from conversational inference. Ask permission before summarizing contact information. English only.";
const APPROVED_SUPPORT_BRIEF = "You are the Stellar UC Intelligent Customer Product Support Desk representative in a fictional support intake test. Be natural and concise. Ask one support-intake question at a time and delegate deeper diagnostic reasoning to the reasoning backend. After collecting and confirming the caller fictional details, use submit_support_intake exactly once. The tool becomes available after the secure voice channel opens. Wait for its returned result. Speak the real caseId only on confirmed success; otherwise explain the record was not confirmed. Never invent a result.";
// Opening wording is separate from the frozen owner-approved conversational persona.
const SUPPORT_GREETING = 'Hello, you have reached Stellar Technologies Support Desk. Who do I have the pleasure of speaking with?';
const SUPPORT_GREETING_INSTRUCTION = `At the start of this telephone call, say exactly: "${SUPPORT_GREETING}" Then pause and wait for the caller's name. Do not repeat this opening later in the call. After the caller responds, continue naturally using the support instructions below.\n\n`;
// Owner-approved ticket conversation flow; frozen persona/model/voice remain unchanged.
const SUPPORT_TICKET_FLOW = `\n\n# OWNER-APPROVED TICKET CONVERSATION FLOW
After gathering and confirming the intake details, tell the caller: "Please give me a moment while I create your support ticket." Then delegate to submit_support_intake once. Do not use this sentence as a substitute for actually invoking the tool. While a save is pending, acknowledge any caller check-in calmly and explain that you are still waiting for confirmation; do not leave the caller unsure whether you are present.
Only after the tool confirms success with both customerId and caseId, say "Your support ticket has been created. Are you ready to take down the ticket number?" Pause and wait for the caller's answer. Do not read the number before the caller is ready. If they are not ready, acknowledge and wait; if they decline the number, move on without forcing it. When ready, read the exact returned caseId slowly in manageable groups, then offer to repeat it. Never invent, shorten, or replace the identifier.
After giving the ticket number or the caller declining it, ask "Is there anything further I can help you with?" Wait for the answer. If yes, continue the conversation naturally and help with the additional concern without resubmitting the same ticket. If no, and an authorized technician follow-up is explicitly confirmed by a trusted tool result, say "Great, a technician will contact you soon. Have a great day." This owner-approved wording does not imply a specific response-time guarantee. If no follow-up is confirmed, close warmly with "Thank you for calling. Have a great day" without promising technician contact. In this isolated staging test no real outreach is enabled; never claim otherwise.
If saving fails, is unavailable, or is blocked, explain "I could not confirm that your support ticket was created." Do not announce success, offer a fabricated ticket number, or promise technician contact. Offer further help and explain the limitation honestly. No repeated automatic save attempts or duplicate tickets.
Delegate to the backend when the caller asks to create or submit a support ticket, confirms the final intake summary, asks for submission status, corrects captured details, or reports that they are waiting. The Live speaking model cannot execute the database tool itself: request backend work rather than merely saying the save is pending. The backend must extract the nine required fields from the existing conversation, ask for any missing information or confirmation, and invoke submit_support_intake only when complete and confirmed. A backend review request does not mean that a save has started. If an application fallback asks for a backend review, use the current conversation without making the caller repeat it.
Move promptly from the caller's final confirmation to the save tool. Do not say you are waiting for ticket creation before the application has actually started saving. If required details or permission are missing, ask the next necessary question promptly instead of waiting silently. Application ticket-status updates are authoritative: distinguish pending, confirmed and failed saves. After a confirmed result, promptly tell the caller the ticket is created and ask readiness. Read only the exact application-supplied ticket identifier; never improvise an identifier while waiting for the backend. A spoken farewell does not itself prove a telephone disconnect; do not claim a call ended or a callback was arranged without an implemented, authorized action.\n`;


// Direct WebSocket endpoint for Live API (no HTTP pre-auth, same pattern as old pool)
const LIVE_WS_URL = 'wss://api.openai.com/v1/live/sessions';
const CSS_TENANT_ID = process.env.CSS_TENANT_ID || '5885a020-d363-4c27-910a-c035eda132f5';
const TRANSFER_NUMBER = process.env.TRANSFER_NUMBER || '+17023087429';
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_CALLS || '10', 10);
const MAX_CALL_MS = parseInt(process.env.MAX_CALL_DURATION_MS || '2700000', 10); // 45 min
const TOKEN_TTL_SECS = 120;

let activeCalls = 0;
let lastStagingSupportSession = null;
let lastStagingSupportSave = null;
const recentEvents = [];
function logEvent(msg) { console.log(msg); recentEvents.push({ t: Date.now(), msg }); if (recentEvents.length > 50) recentEvents.shift(); }

// ─── OpenAI connection pool — pre-warmed Live API WebSocket connections ────────
// Same pattern as old Realtime pool: open WS, wait for 'open', serve on demand.
// Session is configured per-call via session.start (sent once WS is open + intake done).
const wsPool = [];
const POOL_SIZE = 2;

function openPoolWs() {
  const ws = new WebSocket(LIVE_WS_URL, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  });
  ws._poolReady = false;
  ws.once('open', () => { ws._poolReady = true; logEvent('[pool] Live WS ready'); });
  ws.once('error', (e) => { logEvent(`[pool] ws error: ${e.message}`); ws.close(); });
  ws.once('close', () => {
    const i = wsPool.indexOf(ws);
    if (i !== -1) wsPool.splice(i, 1);
    setTimeout(fillPool, 5000);
  });
  wsPool.push(ws);
}

function fillPool() {
  if (!OPENAI_API_KEY) return;
  while (wsPool.length < POOL_SIZE) openPoolWs();
}

function claimPooled() {
  const i = wsPool.findIndex(w => w._poolReady && w.readyState === WebSocket.OPEN);
  if (i === -1) return null;
  const [ws] = wsPool.splice(i, 1);
  logEvent('[pool] claimed');
  setTimeout(fillPool, 0);
  return ws;
}

// ─── HMAC token validation ────────────────────────────────────────────────────
function validateBridgeToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split(':');
  if (parts.length !== 4) return null;
  const [profile, tsStr, nonce, sig] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > TOKEN_TTL_SECS) return null;
  const payload = `${profile}:${ts}:${nonce}`;
  const expected = crypto.createHmac('sha256', BRIDGE_HMAC_SECRET).update(payload).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
  } catch { return null; }
  if (profile !== 'sales' && profile !== 'support') return null;
  return profile;
}

// ─── Twilio REST API helper ───────────────────────────────────────────────────
async function twilioUpdateCall(callSid, twiml) {
  if (STAGING_ONLY) return; // never perform external hangups or transfers from staging
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`;
  const creds = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `Twiml=${encodeURIComponent(twiml)}`,
    signal: AbortSignal.timeout(8000),
  }).catch(e => console.error('[bridge] Twilio REST failed', e.message));
}

// ─── Bridge HMAC for Netlify tool endpoints ───────────────────────────────────
function makeBridgeSignature() {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac('sha256', BRIDGE_HMAC_SECRET).update(`phone-support-intake:${ts}`).digest('hex');
  return `${ts}.${sig}`;
}

// ─── Intake helpers ───────────────────────────────────────────────────────────
async function callSalesIntakeStart(callSid, callerPhone) {
  if (STAGING_ONLY) return { interactionId: `staging:${callSid}`, transferAllowed: 'no' };
  const res = await fetch(`${NETLIFY_BASE_URL}/api/intake/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ai4cc-intake-key': AI4CC_INTAKE_KEY },
    body: JSON.stringify({ action: 'start', conversationId: callSid, callerPhone }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`intake/start ${res.status}`);
  return res.json();
}

async function callSalesIntakeSubmit(body) {
  if (STAGING_ONLY) throw new Error('STAGING_WRITES_DISABLED');
  const res = await fetch(`${NETLIFY_BASE_URL}/api/intake/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ai4cc-intake-key': AI4CC_INTAKE_KEY },
    body: JSON.stringify({ action: 'submit', ...body }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`intake/submit ${res.status}`);
  return res.json();
}

async function callSupportIntake(body) {
  if (STAGING_ONLY) throw new Error('STAGING_WRITES_DISABLED');
  const res = await fetch(`${NETLIFY_BASE_URL}/api/twilio/phone-support-intake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-bridge-signature': makeBridgeSignature() },
    body: JSON.stringify({ tenantId: CSS_TENANT_ID, ...body }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`support-intake ${res.status}`);
  return res.json();
}

// ─── Profile definitions ──────────────────────────────────────────────────────
const SALES_SYSTEM_PROMPT = `# Role
You are the sales representative for the Intelligent Customer Engagement Operation Center. You answer inbound calls from business owners and decision-makers. You are also the live demonstration: the caller is experiencing the product while talking to you. The controlling principle is THE DEMO PERFORMS THE SALE: show a capability instead of describing it whenever you can.

# Core message (lead with this)
1. 24/7 sales: "Your business may close, while your sales operation stays open 24/7."
2. Transparent monthly cost: they only pay for the service provided.
3. Multiple calls at once: it answers several callers at the same time.

# How you speak
This is a phone call. Keep every turn short: one or two sentences, then one question. Never read lists aloud. Be professional, confident, warm, patient and consultative. No pressure, no hype, no jargon.

# Product name and disclosure
- Always call the product "the Intelligent Customer Engagement Operation Center". Never call it "AI4", "AI4 Contact Center", "AI4CC" or "Stellar".
- If asked who the company is: "Stellar Unified Communications."
- Never name vendors or internals.
- If asked whether you're a person, say honestly that you're the intelligent conversational agent that is part of the product.

# Call setup (already handled)
At the start of this call, the system already ran intake and will tell you: INTERACTION_ID, TRANSFER_ALLOWED (yes/no), KNOWN_CALLER_NAME, and CALLER_NUMBER. Use these in your responses. If KNOWN_CALLER_NAME is set, confirm it with the caller ("Am I speaking with [first name]?"). If empty, ask "And who do I have the pleasure of speaking with?"

# Tools you have
- submit_business_profile: Call once right before your closing goodbye (or just before transfer). Collect: caller name, callback phone (read back digit by digit from CALLER_NUMBER to confirm), email (spell back letter by letter), business name, service interest, and full discovery summary. Confirm phone and email out loud before calling.
- end_call: Call after saying goodbye to hang up cleanly.
- transfer_to_specialist: Call after submit_business_profile when TRANSFER_ALLOWED is "yes" and the caller wants to speak with a person. If TRANSFER_ALLOWED is "no", offer a callback instead.

# Conversation flow
1. GREETING: Start with: "Hello, you have reached Stellar Unified Communications. Who do I have the pleasure of speaking to today?" Then proceed with discovery.
2. DISCOVERY: One question at a time: company/industry, role, how customers reach them, hours, common call reasons, missed calls, phone system, main problem, timing.
3. PERSONALIZED DEMONSTRATION: Role-play a scenario from their business. "You don't have to imagine what this would be like. You're experiencing it right now."
4. VALUE VALIDATION: Ask one short question so the caller names the value themselves.
5. CONVERSION: Watch for buying signals and move to follow-up.
6. FOLLOW-UP: Confirm phone and email, call submit_business_profile, offer specialist or call end_call.

# What you can say
- "Keep your number. Add the intelligence."
- Pricing is usage-based; monthly service fee plus calls handled; no overage; no long-term contract.
- Setup typically one to two weeks. There is a one-time implementation fee (do not state an amount).
- Support is included up to two hours/month; larger projects at $125/hour.
- Multiple callers at once; after-hours, no-answer, overflow coverage.

# Scope limits
- Never book appointments directly. Never promise integrations. Never state dollar amounts.
- Transfers only when TRANSFER_ALLOWED is "yes". Outside transfer hours: take a callback.

# Never do these
Never invent capabilities, prices, discounts, trials, pilots, timelines, integrations, certifications or future features.`;

const SUPPORT_SYSTEM_PROMPT = `You are the Stellar UC Customer Support representative. You answer inbound support calls.

Be warm, concise, attentive, and professional. Ask one question at a time.

## Conversation Flow

1. GREETING (already delivered): The caller was greeted with "Hello, you have reached Stellar Technologies. Who do I have the pleasure of speaking with?" — wait for their name.
2. ACKNOWLEDGMENT: Once the caller gives their name, say "[Name], how can we help you today?" then listen.
3. INTAKE: Collect the following one question at a time:
   - Full name (collected in step 1)
   - Phone number (read back digit by digit to confirm)
   - Email address (spell back letter by letter to confirm)
   - Product they need help with
   - Approximate purchase date
   - Description of the problem
   - Steps they have already tried
   - Business impact (how this affects their work)
   - Urgency (LOW, NORMAL, HIGH, or URGENT based on impact)
4. CONFIRM: Read all details back and ask the caller to confirm before submitting.
5. SUBMIT: Call submit_support_intake exactly once. Wait for the tool result. Only say a case was created if the tool returns success with a caseId. Never invent a case number.
6. CLOSE: "A support case has been opened. Our team will follow up with you." Then call end_call.

If submit_support_intake fails, apologize and advise them to call back or email support@stellaruc.com.

Never ask for passwords or payment information. Never promise specific fix timelines.`;

// transfer_to_specialist always present; bridge enforces transferAllowed at execution time
function salesTools(interactionId) {
  return [
    {
      type: 'function',
      name: 'submit_business_profile',
      description: 'Submit the lead record right before saying goodbye or transferring.',
      parameters: {
        type: 'object',
        properties: {
          interactionId: { type: 'string', description: `Use: ${interactionId}` },
          callerName: { type: 'string' },
          businessName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          serviceInterest: { type: 'string' },
          description: { type: 'string', description: 'Compact labeled-line discovery summary' },
        },
        required: ['interactionId', 'description'],
        additionalProperties: false,
      },
    },
    {
      type: 'function',
      name: 'transfer_to_specialist',
      description: 'Transfer to a human specialist. Only after submit_business_profile.',
      parameters: { type: 'object', properties: { reason: { type: 'string' } }, additionalProperties: false },
    },
    {
      type: 'function',
      name: 'end_call',
      description: 'Hang up the call after saying goodbye.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  ];
}

const supportTools = [
  {
    type: 'function',
    name: 'submit_support_intake',
    description: 'Submit the support case after confirming all details.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        product: { type: 'string' },
        purchaseDate: { type: 'string' },
        issue: { type: 'string' },
        steps: { type: 'string' },
        impact: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
      },
      required: ['name', 'phone', 'product', 'issue', 'steps', 'impact', 'priority'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'end_call',
    description: 'Hang up the call after closing the conversation.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
];

// Staging tool definition matches the approved browser baseline (b8ce29ad) exactly,
// with end_call added for telephone. All 9 fields required; description preserves
// fictional-test framing the owner approved.
const stagingSupportTools = [
  {
    type: 'function',
    name: 'submit_support_intake',
    description: 'Submit a fictional customer support intake to staging only after confirming all details with the caller. Call exactly once, then wait for the real database result before speaking a case ID.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        product: { type: 'string' },
        purchaseDate: { type: 'string', description: 'YYYY-MM-DD' },
        issue: { type: 'string' },
        steps: { type: 'string' },
        impact: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
      },
      required: ['name', 'email', 'phone', 'product', 'purchaseDate', 'issue', 'steps', 'impact', 'priority'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'end_call',
    description: 'Hang up the call after closing the conversation.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
];

// ─── Per-call WebSocket handler ───────────────────────────────────────────────
async function handleCall(twilioWs, profile, callerPhone, callSid) {
  logEvent(`[${callSid}] ${profile} call started caller=${callerPhone}`);
  activeCalls++;
  let openaiWs = null;
  let streamSid = null;
  let interactionId = null;
  let transferAllowed = 'no';
  let leadSaved = false;
  let leadSubmissionPending = false;
  let callEnded = false;
  let audioDeltaCount = 0;
  let sessionStarted = false;
  const audioBuffer = []; // caller input waits until the first greeting chunk has played
  const GREETING_MARK = 'stellar-greeting-start';
  const MAX_STARTUP_AUDIO_BYTES = 80000; // ten seconds of PCMU at 8 kHz
  let startupAudioBytes = 0;
  let greetingAudioSent = false;
  let greetingPlayed = false;
  let streamStartedAt = null;
  let greetingDeadline = null;
  let startupSilence = null;
  const supportProgressTimers = new Set();
  let supportReviewTimer = null;
  let supportInputVersion = 0;
  let supportReviewedVersion = 0;
  let supportBackendActive = false;
  let supportSavePending = false;

  const deadline = setTimeout(() => { logEvent(`[${callSid}] max duration`); cleanup('MAX_DURATION'); }, MAX_CALL_MS);

  function cleanup(reason) {
    if (callEnded) return;
    callEnded = true;
    clearTimeout(deadline);
    clearTimeout(greetingDeadline);
    clearTimeout(supportReviewTimer);
    clearInterval(startupSilence);
    for (const timer of supportProgressTimers) clearTimeout(timer);
    supportProgressTimers.clear();
    audioBuffer.length = 0;
    activeCalls = Math.max(0, activeCalls - 1);
    logEvent(`[${callSid}] cleanup: ${reason}`);
    if (openaiWs && openaiWs.readyState !== WebSocket.CLOSED) openaiWs.close();
    if (twilioWs.readyState === WebSocket.OPEN) twilioWs.close();
  }

  function sendToTwilio(obj) {
    if (twilioWs.readyState === WebSocket.OPEN) twilioWs.send(JSON.stringify(obj));
  }

  function sendToOpenAI(obj) {
    if (!callEnded && openaiWs && openaiWs.readyState === WebSocket.OPEN) openaiWs.send(JSON.stringify(obj));
  }

  // Recover missed Live -> Responses delegation without interpreting caller words in regexes.
  // The existing backend decides whether intake is complete and consent is confirmed.
  function scheduleSupportReview(delay = 15000) {
    clearTimeout(supportReviewTimer);
    supportReviewTimer = setTimeout(() => {
      if (callEnded || !sessionStarted || !greetingPlayed || supportReviewedVersion >= supportInputVersion) return;
      if (supportBackendActive || supportSavePending) { scheduleSupportReview(5000); return; }
      supportReviewedVersion = supportInputVersion;
      supportBackendActive = true;
      logEvent(`[${callSid}] support backend review requested after caller inactivity`);
      sendToOpenAI({type:'response.create'});
    }, delay);
  }

  function clearTwilioAudio() {
    if (streamSid) sendToTwilio({ event: 'clear', streamSid });
  }

  // ── Send session.start to configure the Live API session ──────────────────
  // Called once: after WS is open AND intake is complete
  function startSession(instructions, tools) {
    // Staging support: omit session.input — the brief gpt-live-1 direct-audio path produces
    // inaudible output. Greeting fires via response.create in session.started handler instead,
    // which routes through delegation (gpt-5.6-terra) and produces audible session.output_transcript.
    const sessionInput = !(STAGING_ONLY && profile === 'support')
      ? { input: [{ role: 'developer', content: [{ type: 'input_text', text:
          profile === 'support'
            ? 'Say this exact greeting immediately, word for word, with no additions: "Hello, you have reached Stellar Technologies. Who do I have the pleasure of speaking with?" Then wait silently for the caller\'s response.'
            : 'Greet the caller now in English as the Sales Specialist, then pause and listen.'
        }] }] }
      : {};
    sendToOpenAI({
      type: 'session.start',
      session: {
        model: LIVE_MODEL,
        ...sessionInput,
        instructions: STAGING_ONLY && profile === 'support' ? SUPPORT_GREETING_INSTRUCTION + APPROVED_SUPPORT_BRIEF + SUPPORT_TICKET_FLOW : profile === 'sales'
          ? 'You are the Stellar UC Intelligent Sales Specialist on a phone call. Be natural, professional, and concise.'
          : 'You are the Stellar UC Intelligent Support Specialist on a phone call. Be warm, clear, and professional.',
        audio: { format: { type: 'audio/pcmu', rate: 8000 } },
        // The owner-approved browser Support session used provider-default turn behavior.
        ...(STAGING_ONLY && profile === 'support' ? {} : { turn_detection: {
          type: 'server_vad',
          threshold: 0.6,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
          interrupt_response: false,
        } }),
        delegation: {
          type: 'responses',
          responses: {
            model: REASONING_MODEL,
            instructions: STAGING_ONLY && profile === 'support' ? SUPPORT_GREETING_INSTRUCTION + instructions + SUPPORT_TICKET_FLOW : instructions,
            tools,
            tool_choice: 'auto',
          },
        },
      },
    });
  }

  // ── Execute a tool call ────────────────────────────────────────────────────
  async function executeTool(callId, name, argsStr) {
    let output = {};

    try {
      if (typeof callId !== 'string' || !callId.trim()) throw new Error('Missing tool call ID');
      const args = JSON.parse(argsStr);
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid tool arguments');
      if (name === 'submit_business_profile') {
        if (leadSubmissionPending) throw new Error('Lead submission already pending');
        if (leadSaved) { output = { success: true, alreadySaved: true }; }
        else {
          if (!interactionId) throw new Error('No verified interaction ID for this call');
          leadSubmissionPending = true;
          try {
            const persisted = await callSalesIntakeSubmit({ ...args, interactionId });
            if (!persisted || typeof persisted.lead?.id !== 'string' || !persisted.lead.id.trim()) throw new Error('Lead persistence not confirmed by intake API');
            leadSaved = true;
            output = { success: true, leadId: persisted.lead.id };
          } finally { leadSubmissionPending = false; }
        }
      } else if (name === 'submit_support_intake') {
        if (!STAGING_ONLY) output = await callSupportIntake({ ...args, callSid });
        else {
          const started = Date.now();
          supportSavePending = true;
          let pending = true;
          logEvent(`[${callSid}] support save started`);
          sendToOpenAI({type:'session.commentary.append',delegation_id:null,
            content:'The application is now submitting the support ticket. Please give me a moment while I create your support ticket. Creation is not confirmed yet.'});
          const timer = setTimeout(() => {
            supportProgressTimers.delete(timer);
            if (pending && !callEnded) sendToOpenAI({type:'session.commentary.append',delegation_id:null,
              content:'The application is still waiting for the ticket save result. Thank you for your patience; I am still here. Do not announce success yet.'});
          }, 4000);
          supportProgressTimers.add(timer);
          try {
            output = await submitStagingSupport(args, callSid);
            lastStagingSupportSave = {elapsedMs:Date.now()-started,status:'confirmed'};
            // Give the speaking Live model verified facts directly, before backend continuation.
            sendToOpenAI({type:'session.thinking.append',delegation_id:null,
              content:`Verified database save: support ticket created. The exact caseId is ${output.caseId}. Use only this identifier, never an invented substitute. Notifications and technician follow-up are disabled.`});
            sendToOpenAI({type:'session.instructions.append',delegation_id:null,
              content:`The database has confirmed ticket ${output.caseId}. Promptly tell the caller their support ticket is created and ask whether they are ready to take down the number. Wait for readiness. When ready, read exactly ${output.caseId} in character groups; never invent or shorten it.`});
          } catch (error) {
            lastStagingSupportSave = {elapsedMs:Date.now()-started,status:'not_confirmed'};
            sendToOpenAI({type:'session.instructions.append',delegation_id:null,
              content:'The application could not confirm ticket creation. Tell the caller no ticket was confirmed. Do not provide a ticket number or promise technician contact. Offer further help.'});
            throw error;
          } finally {
            pending = false;
            supportSavePending = false;
            clearTimeout(timer);
            supportProgressTimers.delete(timer);
            logEvent(`[${callSid}] support save ${lastStagingSupportSave.status} elapsedMs=${lastStagingSupportSave.elapsedMs}`);
          }
        }
      } else if (name === 'end_call') {
        output = { success: true };
        setTimeout(() => { twilioUpdateCall(callSid, '<Response><Hangup/></Response>'); cleanup('END_CALL_TOOL'); }, 1500);
      } else if (name === 'transfer_to_specialist') {
        if (STAGING_ONLY) {
          output = { error: 'STAGING_TRANSFERS_DISABLED: no transfer was attempted.' };
        } else if (!leadSaved) {
          output = { error: 'Transfer blocked: lead has not been saved and verified.' };
        } else if (transferAllowed !== 'yes') {
          output = { error: 'Transfer not available for this call. Offer a callback instead.' };
        } else {
          output = { success: true };
          setTimeout(() => { twilioUpdateCall(callSid, `<Response><Dial>${TRANSFER_NUMBER}</Dial></Response>`); cleanup('TRANSFER_TOOL'); }, 1000);
        }
      } else {
        output = { error: 'unknown_tool' };
      }
    } catch (e) {
      console.error(`[${callSid}] tool ${name} failed:`, e.message);
      output = { error: e.message };
    }

    // GPT-Live Responses delegation requires response.item.create, not legacy conversation.item.create.
    sendToOpenAI({ type: 'response.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(output) } });
    sendToOpenAI({ type: 'response.create' });
  }

  // ── OpenAI WebSocket event handlers ───────────────────────────────────────
  function attachOpenAIHandlers() {
    const toolCallBuffers = {};
    const completedToolCalls = new Set();

    openaiWs.on('message', (raw) => {
      if (callEnded) return;
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      // Delegated Responses events may arrive inside Live response.event envelopes.
      if (msg.type === 'response.event' && msg.event && typeof msg.event === 'object') msg = msg.event;
      const t = msg.type;
      if (STAGING_ONLY && profile === 'support') {
        if (t === 'session.input_transcript.delta' && typeof msg.delta === 'string' && msg.delta.trim()) {
          supportInputVersion++;
          scheduleSupportReview();
        }
        if (t === 'response.created') {
          supportBackendActive = true;
          supportReviewedVersion = supportInputVersion;
        }
        if (['response.completed','response.done','response.failed','response.cancelled'].includes(t))
          supportBackendActive = false;
      }

      // Lifecycle
      if (t === 'session.started' || t === 'session.created' || t === 'session.updated') {
        logEvent(`[${callSid}] ${t} model=${msg.session?.model || '?'}`);
        if (STAGING_ONLY && profile === 'support' && msg.session) {
          // Keep only non-sensitive provider-resolved settings; never retain the full session.
          const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(value) ? value : null;
          lastStagingSupportSession = {
            model: safeId(msg.session.model),
            voice: safeId(msg.session.audio?.output?.voice),
            audioFormat: safeId(msg.session.audio?.format?.type),
            reasoningModel: safeId(msg.session.delegation?.responses?.model),
          };
        }
        if (t === 'session.started' && !sessionStarted) {
          sessionStarted = true;
          logEvent(`[${callSid}] greeting startup ready streamElapsedMs=${Date.now() - streamStartedAt}`);
          // For staging support: session.input alone only produces brief gpt-live-1 direct audio
          // (no transcript events, inaudible on a real call). Force the greeting through the
          // delegation path (gpt-5.6-terra) with response.create — produces session.output_transcript.delta
          // and audible speech.
          if (STAGING_ONLY && profile === 'support') {
            sendToOpenAI({ type: 'response.create' });
          }
          // Hold early caller speech until greeting mark echo; keep Live audio clock with PCMU silence.
          const silence = Buffer.alloc(160, 0xff).toString('base64');
          startupSilence = setInterval(() => {
            if (!callEnded && !greetingPlayed)
              sendToOpenAI({ type: 'session.input_audio.append', audio: silence });
          }, 20);
        }
      } else if (t === 'response.created' || t === 'response.done') {
        logEvent(`[${callSid}] ${t} status=${msg.response?.status} items=${JSON.stringify((msg.response?.output || []).map(i => i.type))}`);
      } else if (t === 'input_audio_buffer.speech_started' || t === 'session.speech_started') {
        logEvent(`[${callSid}] speech_started`);
      } else if (t === 'error') {
        logEvent(`[${callSid}] OpenAI error: ${msg.error?.message || JSON.stringify(msg.error)}`);
      } else if (!['session.output_audio.delta','response.output_audio.delta',
        'response.output_audio_transcript.delta','response.function_call_arguments.delta',
        'response.function_call_arguments.done','response.output_item.added',
        'response.output_item.done','response.content_part.added','response.content_part.done',
        'response.audio.done','response.audio_transcript.delta','response.audio_transcript.done',
        'response.text.delta','response.text.done','input_audio_buffer.committed',
        'input_audio_buffer.speech_stopped','session.speech_stopped',
        'conversation.item.created','conversation.item.done','rate_limits.updated'].includes(t)) {
        logEvent(`[${callSid}] oai: ${t} ${JSON.stringify(msg).slice(0, 120)}`);
      }

      // Audio out → Twilio (Live API: session.output_audio.delta; Realtime: response.output_audio.delta)
      if ((t === 'session.output_audio.delta' || t === 'response.output_audio.delta') && msg.delta) {
        if (!audioDeltaCount) { logEvent(`[${callSid}] first audio delta streamElapsedMs=${Date.now() - streamStartedAt}`); }
        audioDeltaCount++;
        sendToTwilio({ event: 'media', streamSid, media: { payload: msg.delta } });
        if (!greetingAudioSent) {
          greetingAudioSent = true;
          // Twilio echoes this mark when the preceding first audio chunk has played.
          sendToTwilio({ event: 'mark', streamSid, mark: { name: GREETING_MARK } });
        }
      } else if (t === 'input_audio_buffer.speech_started' || t === 'session.speech_started') {
        // Startup speech must not erase the greeting before any audio has played.
        // GPT-Live manages full-duplex speech itself, as in the approved browser.
        // Speech detection alone is not a request to cancel delegated support work.
        if (greetingPlayed && !(STAGING_ONLY && profile === 'support')) {
          clearTwilioAudio();
          sendToOpenAI({ type: 'response.cancel' });
        }
      } else if (STAGING_ONLY && profile === 'support' && t === 'response.output_item.done'
        && msg.item?.type === 'function_call') {
        const { call_id: id, name, arguments: args } = msg.item;
        if (typeof id !== 'string' || !id.trim() || completedToolCalls.has(id)) return;
        completedToolCalls.add(id);
        delete toolCallBuffers[id];
        executeTool(id, name, args || '{}');
      } else if (STAGING_ONLY && profile === 'support'
        && (t === 'response.function_call_arguments.delta' || t === 'response.function_call_arguments.done')) {
        // Arguments fragments may lack name/call correlation. Wait for the finished item.
        return;
      } else if (t === 'response.function_call_arguments.delta') {
        const id = msg.call_id;
        if (!toolCallBuffers[id]) toolCallBuffers[id] = { name: msg.name || '', args: '' };
        toolCallBuffers[id].args += (msg.delta || '');
      } else if (t === 'response.function_call_arguments.done') {
        const id = msg.call_id;
        if (typeof id !== 'string' || !id.trim() || completedToolCalls.has(id)) return;
        completedToolCalls.add(id);
        const buf = toolCallBuffers[id] || { name: msg.name || '', args: msg.arguments || '' };
        delete toolCallBuffers[id];
        executeTool(id, buf.name || msg.name, buf.args || msg.arguments || '{}');
      }
    });

    openaiWs.on('close', (code, reason) => { logEvent(`[${callSid}] OpenAI ws closed: ${code} ${reason}`); cleanup('OPENAI_CLOSE'); });
    openaiWs.on('error', (e) => { logEvent(`[${callSid}] OpenAI ws error: ${e.message}`); cleanup('OPENAI_ERROR'); });
  }

  // ── Twilio Media Streams handler ───────────────────────────────────────────
  twilioWs.on('message', async (raw) => {
    if (callEnded) return;
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.event === 'start') {
      if (streamSid) return;
      streamStartedAt = Date.now();
      greetingDeadline = setTimeout(() => cleanup('GREETING_START_TIMEOUT'), 10000);
      streamSid = msg.start?.streamSid || msg.streamSid;
      logEvent(`[${callSid}] stream started sid=${streamSid}`);

      // Resolve sales context before exposing sales tools; support keeps its own intake.
      const intakeP = profile === 'sales'
        ? callSalesIntakeStart(callSid, callerPhone)
        : Promise.resolve(null);

      openaiWs = claimPooled();
      const poolHit = !!openaiWs;
      if (!poolHit) {
        logEvent(`[${callSid}] pool miss — opening fresh WS`);
        openaiWs = new WebSocket(LIVE_WS_URL, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } });
      }

      // Attach handlers before any awaits so we miss no events
      attachOpenAIHandlers();

      const wsReady = poolHit
        ? Promise.resolve()
        : new Promise((res, rej) => { openaiWs.once('open', res); openaiWs.once('error', rej); });

      wsReady.then(async () => {
        logEvent(`[${callSid}] OpenAI WS open (pool=${poolHit})`);
        const intake = await intakeP;
        if (callEnded) return;

        let instructions;
        let tools;
        if (profile === 'sales') {
          if (!intake || typeof intake.interactionId !== 'string' || !intake.interactionId.trim())
            throw new Error('Sales intake did not return an interaction ID');
          interactionId = intake.interactionId;
          transferAllowed = intake.transferAllowed === 'yes' ? 'yes' : 'no';
          instructions = SALES_SYSTEM_PROMPT + `\n\n# CALL CONTEXT\nINTERACTION_ID: ${interactionId}\nTRANSFER_ALLOWED: ${transferAllowed}\nKNOWN_CALLER_NAME: ${intake.knownCallerName || ''}\nCALLER_NUMBER: ${callerPhone}`;
          tools = salesTools(interactionId);
        } else {
          instructions = STAGING_ONLY ? APPROVED_SUPPORT_INSTRUCTIONS : SUPPORT_SYSTEM_PROMPT
            + `\n\n# CALL CONTEXT\nCALL_SID: ${callSid}\nCALLER_PHONE: ${callerPhone}`;
          // Staging uses the approved-baseline tool schema; production uses the production schema.
          tools = STAGING_ONLY ? stagingSupportTools : supportTools;
        }

        startSession(instructions, tools);
      }).catch(e => { logEvent(`[${callSid}] WS open error: ${e.message}`); cleanup('WS_OPEN_ERROR'); });

      await new Promise(res => setTimeout(res, 0)); // yield so handlers are registered before any messages

    } else if (msg.event === 'media' && openaiWs) {
      const payload = msg.media?.payload;
      if (payload) {
        if (!greetingPlayed) {
          startupAudioBytes += Buffer.byteLength(payload, 'base64');
          if (startupAudioBytes > MAX_STARTUP_AUDIO_BYTES || audioBuffer.length >= 500) {
            cleanup('STARTUP_AUDIO_OVERFLOW');
            return;
          }
          audioBuffer.push(payload);
        } else if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({ type: 'session.input_audio.append', audio: payload }));
        }
      }
    } else if (msg.event === 'mark' && msg.streamSid === streamSid
      && msg.mark?.name === GREETING_MARK && greetingAudioSent && !greetingPlayed) {
      greetingPlayed = true;
      clearTimeout(greetingDeadline);
      clearInterval(startupSilence);
      logEvent(`[${callSid}] greeting first chunk played streamElapsedMs=${Date.now() - streamStartedAt} queuedPackets=${audioBuffer.length}`);
      for (const payload of audioBuffer) sendToOpenAI({ type: 'session.input_audio.append', audio: payload });
      audioBuffer.length = 0;
      startupAudioBytes = 0;
    } else if (msg.event === 'stop') {
      cleanup('TWILIO_STOP');
    }
  });

  twilioWs.on('close', () => cleanup('TWILIO_CLOSE'));
  twilioWs.on('error', (e) => { console.error(`[${callSid}] Twilio ws error`, e.message); cleanup('TWILIO_WS_ERROR'); });
}

// ─── Express + WebSocket server ───────────────────────────────────────────────
function start() {
  if (!OPENAI_API_KEY) { console.error('OPENAI_API_KEY not set'); process.exit(1); }
  if (!BRIDGE_HMAC_SECRET) { console.error('BRIDGE_HMAC_SECRET not set'); process.exit(1); }

  fillPool();

  const app = express();
  app.get('/health', (_, res) => res.json({ ok: true, activeCalls, pool: wsPool.length, stagingOnly: STAGING_ONLY, commit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
    supportPersonaFingerprint: STAGING_ONLY ? crypto.createHash('sha256').update(JSON.stringify([APPROVED_SUPPORT_BRIEF, APPROVED_SUPPORT_INSTRUCTIONS])).digest('hex') : null,
    supportLastSave: STAGING_ONLY ? lastStagingSupportSave : null,
    supportPersistence: STAGING_ONLY ? supportWriteReadiness(process.env) : null,
    supportTicketFlowRevision: STAGING_ONLY ? 'owner-2026-10-17-v2-review-watchdog' : null,
    supportRuntime: STAGING_ONLY ? lastStagingSupportSession : null,
    supportGreeting: STAGING_ONLY ? SUPPORT_GREETING : null,
    supportPersonaBaseline: STAGING_ONLY ? 'b8ce29ad04261134e45491c85a42acb0ce038f27' : null,
  }));

  app.get('/debug', async (req, res) => {
    if (STAGING_ONLY) {
      const supplied = Buffer.from(req.headers.authorization || '');
      const expected = Buffer.from(`Bearer ${BRIDGE_HMAC_SECRET}`);
      if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected))
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const results = {
      hmacSecretSet: !!BRIDGE_HMAC_SECRET,
      openaiKeySet: !!OPENAI_API_KEY,
      liveModel: LIVE_MODEL,
      reasoningModel: REASONING_MODEL,
      poolSize: wsPool.length,
      poolReady: wsPool.filter(w => w._poolReady).length,
    };
    try {
      const ts = Math.floor(Date.now() / 1000);
      const nonce = crypto.randomBytes(8).toString('hex');
      const payload = `sales:${ts}:${nonce}`;
      const sig = crypto.createHmac('sha256', BRIDGE_HMAC_SECRET).update(payload).digest('hex');
      results.selfMintValid = validateBridgeToken(`${payload}:${sig}`) === 'sales';
    } catch (e) { results.selfMintError = e.message; }
    if (req.query.token) results.externalTokenValid = validateBridgeToken(req.query.token);
    results.recentEvents = recentEvents.slice(-20);
    res.json(results);
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const profile = pathParts[1] || url.searchParams.get('profile');
    logEvent(`[upgrade] path=${url.pathname} profile=${profile} from=${req.socket.remoteAddress}`);
    if (pathParts[0] !== 'ws') { logEvent('[upgrade] rejected: wrong path'); socket.destroy(); return; }
    if (activeCalls >= MAX_CONCURRENT) { logEvent('[upgrade] rejected: concurrent limit'); socket.destroy(); return; }
    if (profile !== 'sales' && profile !== 'support') { logEvent(`[upgrade] rejected: bad profile ${profile}`); socket.destroy(); return; }

    logEvent(`[upgrade] accepted profile=${profile}`);
    wss.handleUpgrade(req, socket, head, (ws) => {
      let callerPhone = '';
      let callSid = '';

      const firstMessage = (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { logEvent('[ws] bad JSON'); ws.close(); return; }
        logEvent(`[ws] first msg event=${msg.event}`);
        if (msg.event === 'connected') return;
        if (msg.event !== 'start') { logEvent(`[ws] unexpected ${msg.event}`); ws.close(); return; }

        const params = msg.start?.customParameters || {};
        const tokenStr = params.bridge_token || params.token;
        const tokenProfile = validateBridgeToken(tokenStr);
        if (!tokenProfile || tokenProfile !== profile) {
          logEvent(`[bridge] token rejected: tokenProfile=${tokenProfile} urlProfile=${profile}`);
          ws.close();
          return;
        }
        logEvent(`[bridge] token accepted for ${profile}`);
        callerPhone = msg.start?.from || params.callerPhone || '';
        callSid = msg.start?.callSid || '';

        ws.removeListener('message', firstMessage);
        handleCall(ws, profile, callerPhone, callSid);
        ws.emit('message', raw);
      };

      ws.on('message', firstMessage);
      ws.on('close', (code) => logEvent(`[ws] pre-start close code=${code}`));
    });
  });

  server.listen(PORT, () => {
    console.log(`[bridge] listening on port ${PORT} model=${LIVE_MODEL} reasoning=${REASONING_MODEL}`);
  });
}

start();
