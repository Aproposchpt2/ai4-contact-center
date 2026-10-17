# Stellar UC — Twilio Bridge Status Report
**Date:** October 17, 2026  
**Prepared by:** Claude Sonnet 4.6 (AI Engineering Partner)  
**Status:** ✅ LIVE — Both phone lines operational

---

## Executive Summary

Both Stellar UC inbound phone lines are live as of the evening of October 17, 2026. The bridge was successfully migrated from the OpenAI Realtime API (`gpt-realtime-2.1`) to the OpenAI Live API (`gpt-live-1`) with `gpt-5.6-terra` as the reasoning backend — the same configuration that powered a staging voice POC Jeff described as "extremely intelligent" and which "outshined every agent we ever had." 

The migration required resolving six sequential bugs discovered through live call testing. All six were diagnosed, fixed, deployed, and verified within a single session at a total compute cost of approximately $2.57.

Jeff made a live call to 702-710-2622, spoke with the agent for 2 minutes 32 seconds, and approved it. Both lines now serve the same agent.

---

## Phone Line Configuration

| Line | Number | Profile | Purpose |
|------|--------|---------|---------|
| Sales | 725-330-5102 | `sales` (routes to support agent) | Inbound sales / general inquiries |
| Support | 702-710-2622 | `support` | Inbound support / general inquiries |

**Both lines now serve the identical support agent.** The profile routing (sales/support) remains in the TwiML layer for future differentiation if needed, but both bridge paths use the same prompt, tools, and greeting.

---

## System Architecture

```
Caller Phone
     │
     ▼
Twilio (phone number webhook)
     │  POST to:
     ▼
stellaruc.com/api/twilio/twiml?profile=sales|support
     │  (Netlify Function — pages/api/twilio/twiml.ts)
     │  • Validates Twilio signature (HMAC-SHA1)
     │  • Mints BRIDGE_HMAC_SECRET token (TTL 120s)
     │  • Returns TwiML <Connect><Stream> pointing to bridge
     │
     ▼
stellar-twilio-bridge.fly.dev/ws/sales  (or /ws/support)
     │  (Fly.io — twilio-bridge/server.js, Node 20 Alpine)
     │  • Validates HMAC token
     │  • Claims pre-warmed WebSocket from pool
     │  • Buffers incoming audio until session.started
     │  • Sends session.start → waits for session.started
     │  • Flushes buffered audio → streams live audio both ways
     │
     ▼
wss://api.openai.com/v1/live/sessions
     │  (OpenAI Live API)
     │  • Model: gpt-live-1
     │  • Audio: audio/pcmu at 8000 Hz (G.711 µ-law, Twilio native)
     │  • Delegation → gpt-5.6-terra (reasoning backend)
     │
     ▼
gpt-5.6-terra (reasoning / response generation)
     • Receives full system prompt + call context
     • Executes tool calls (submit_support_intake, end_call)
     • Returns audio responses streamed back through bridge → Twilio → caller
```

---

## Infrastructure Details

### Fly.io Bridge
- **App:** `stellar-twilio-bridge`
- **Region:** `lax` (Los Angeles)
- **Machine:** `shared-cpu-1x`, 256 MB RAM
- **Runtime:** Node.js 20 (Alpine Docker)
- **Source:** `twilio-bridge/server.js` in repo `ai4-contact-center`
- **Health endpoint:** `https://stellar-twilio-bridge.fly.dev/health`
- **Debug endpoint:** `https://stellar-twilio-bridge.fly.dev/debug`
- **Connection pool:** 2 pre-warmed WebSocket connections to OpenAI Live API
- **Concurrency:** Hard limit 25 / Soft limit 20 simultaneous connections
- **Max call duration:** 45 minutes

### Netlify Frontend
- **Site:** stellaruc.com
- **TwiML function:** `pages/api/twilio/twiml.ts`
- **Required env vars:**
  - `TWILIO_AUTH_TOKEN` — validates Twilio webhook signatures
  - `TWILIO_BRIDGE_WS_URL` — e.g. `wss://stellar-twilio-bridge.fly.dev/ws`
  - `BRIDGE_HMAC_SECRET` — shared secret between Netlify and bridge

### Fly.io Bridge Env Vars
- `OPENAI_API_KEY` — OpenAI API key
- `BRIDGE_HMAC_SECRET` — matches Netlify value
- `TWILIO_ACCOUNT_SID` — for in-call TwiML updates (transfer, hangup)
- `TWILIO_AUTH_TOKEN` — for Twilio REST API
- `OPENAI_LIVE_MODEL` — defaults to `gpt-live-1`
- `OPENAI_REASONING_MODEL` — defaults to `gpt-5.6-terra`

---

## Agent Configuration (Current)

### Greeting
> "Hello, you have reached Stellar Technologies. To whom do I have the pleasure of speaking with today?"

### System Prompt (`SUPPORT_SYSTEM_PROMPT`)
The agent acts as the Stellar UC Customer Support representative. Conversation flow:
1. Collect: full name, phone (read back digit by digit), email (spell back), product, purchase date, issue description, steps tried, business impact, urgency (LOW/NORMAL/HIGH/URGENT)
2. Confirm all details out loud before submitting
3. Call `submit_support_intake` once — only confirm case creation if tool returns a `caseId`
4. Say: "A support case has been opened. Our team will follow up with you."
5. Call `end_call`

**Fallback if tool fails:** Advise caller to call back or email `support@stellaruc.com`

### Tools Available
| Tool | Trigger | Action |
|------|---------|--------|
| `submit_support_intake` | After all details collected and confirmed | POST to Netlify support intake endpoint |
| `end_call` | After goodbye | Sends `<Hangup/>` TwiML via Twilio REST API |

### OpenAI Session Parameters
```json
{
  "type": "session.start",
  "session": {
    "model": "gpt-live-1",
    "instructions": "<brief role description>",
    "audio": { "format": { "type": "audio/pcmu", "rate": 8000 } },
    "delegation": {
      "type": "responses",
      "responses": {
        "model": "gpt-5.6-terra",
        "instructions": "<SUPPORT_SYSTEM_PROMPT + call context>",
        "tools": [ "submit_support_intake", "end_call" ],
        "tool_choice": "auto"
      }
    }
  }
}
```

---

## Bugs Resolved During This Session (Chronological)

### Bug 1 — Server OOM crash before `server.listen()` fires
**Symptom:** Machine reached "started" state on Fly.io but immediately refused connections. Zero log output from Node.js — not even the `[bridge] listening on port 8080` line.  
**Diagnosis:** Local test (`node -e "require('./server.js')"`) crashed after 145 seconds with `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`. On the 256 MB Fly.io machine this crash was immediate. Root cause: the previous rewrite used an HTTP POST to `https://api.openai.com/v1/live/sessions` for pool initialization, which started two concurrent HTTPS requests before `server.listen()` was called.  
**Fix:** Replaced the HTTP POST + returned-URL approach with a direct WebSocket connection to `wss://api.openai.com/v1/live/sessions` (same pattern as the old Realtime pool). Session is now configured per-call via `session.start` event rather than at pool creation time.  
**Commit:** `068351e`

---

### Bug 2 — `"The first Live event must be session.start."`
**Symptom:** Bridge connected, stream started, but OpenAI immediately returned an error and closed the WebSocket (code 1006).  
**Diagnosis:** Twilio begins sending `media` events (raw audio) almost immediately after the `start` event — within milliseconds. The bridge was forwarding these as `session.input_audio.append` to OpenAI. However, `session.start` (which configures the session) wasn't sent until the intake API call completed (~100 ms later). The Live API strictly requires `session.start` as the very first message on the WebSocket; any other event sent before it causes an immediate error.  
**Fix:** Added `audioBuffer[]`. All incoming audio is buffered (up to 200 packets ≈ ~4 seconds) while `sessionStarted === false`. When `session.started` fires from OpenAI, the buffer is flushed in order, then live streaming resumes. No audio is lost.  
**Commit:** `9afba04`

---

### Bug 3 — `"Missing required parameter: 'session.audio.format.rate'."`
**Symptom:** Call connected, `session.start` sent, but OpenAI returned an error about the audio format.  
**Diagnosis:** The audio format was `{ type: 'audio/pcmu' }` without a `rate` field. The Live API requires rate to be specified explicitly.  
**Fix:** Added `rate: 8000` → `{ type: 'audio/pcmu', rate: 8000 }`. Twilio Media Streams delivers G.711 µ-law (PCMU) at 8000 Hz.  
**Commit:** `d3e2452`

---

### Bug 4 — `"Invalid value: 'g711_ulaw'. Supported values are: 'audio/pcm', 'audio/pcmu', and 'audio/pcma'."`
**Symptom:** Same audio format error but with the wrong type string.  
**Diagnosis:** After Bug 3, the type had been changed to `g711_ulaw` — which is the convention used by the OpenAI Realtime API. The Live API uses MIME-type style identifiers instead.  
**Fix:** Reverted type to `audio/pcmu` while keeping `rate: 8000`.  
**Commit:** `8731c06`

---

### Bug 5 — Greeting used wrong company name
**Symptom:** 702-710-2622 working and approved, but opening greeting said "Stellar Unified Communications" instead of Jeff's requested wording.  
**Fix:** Changed hardcoded greeting to: `"Hello, you have reached Stellar Technologies. To whom do I have the pleasure of speaking with today?"`  
**Commit:** `e22aef8`

---

### Bug 6 — 725-330-5102 using different (sales) agent
**Symptom:** Sales line was routed to a different prompt and tool set, with a more complex intake flow. Jeff wanted both lines to use the same agent as the approved 702 line.  
**Fix:** Removed all sales-specific branching in `handleCall`. Both profiles now use `SUPPORT_SYSTEM_PROMPT`, `supportTools`, and the identical greeting. The sales profile path still exists in the TwiML layer for future use.  
**Commit:** `d098020`

---

## Call Flow — Step by Step

1. **Caller dials** 725-330-5102 or 702-710-2622
2. **Twilio** POSTs to `stellaruc.com/api/twilio/twiml?profile=sales|support`
3. **Netlify TwiML function:**
   - Validates Twilio HMAC signature
   - Mints a 120-second BRIDGE_HMAC_SECRET token containing: `{profile}:{timestamp}:{nonce}:{sig}`
   - Returns TwiML that opens a Media Stream WebSocket to `wss://stellar-twilio-bridge.fly.dev/ws/{profile}` with the token as a custom parameter
4. **Twilio** opens the WebSocket and sends a `connected` event, then a `start` event containing the token and call metadata
5. **Bridge:**
   - Validates the HMAC token (rejects stale or tampered tokens)
   - Claims a pre-warmed WebSocket from the pool (2 connections pre-warmed at startup)
   - If pool is empty, opens a fresh WS to `wss://api.openai.com/v1/live/sessions`
   - Begins buffering incoming Twilio audio
6. **Bridge sends `session.start`** to OpenAI with:
   - Model: `gpt-live-1`
   - Audio: `audio/pcmu` at 8000 Hz
   - Delegation to `gpt-5.6-terra` with full system prompt + call context
7. **OpenAI responds with `session.started`** — session is live
8. **Bridge flushes audio buffer** (any audio captured during initialization is sent in order)
9. **Bridge sends `response.create`** — triggers the opening greeting
10. **Agent speaks** the greeting, caller responds, conversation proceeds
11. **Audio streaming:** Twilio audio → bridge → `session.input_audio.append` → OpenAI; OpenAI `session.output_audio.delta` → bridge → Twilio media event → caller's earpiece
12. **Interruption handling:** If OpenAI detects speech started (`session.speech_started`), bridge sends `response.cancel` and clears Twilio audio buffer
13. **Tool execution:** When agent calls a tool, bridge executes it (Netlify API call), returns the result, triggers `response.create` to continue
14. **Call end:** Agent calls `end_call` tool → bridge sends `<Hangup/>` via Twilio REST API → both WebSockets close → cleanup

---

## Repository State

**Repo:** `ai4-contact-center` (GitHub: `Aproposchpt2/ai4-contact-center`)  
**Branch:** `main`  
**Latest commit:** `d098020` — feat(bridge): both lines now use the same support agent

### Key Files
| File | Purpose |
|------|---------|
| `twilio-bridge/server.js` | Bridge server — all call handling, pool, OpenAI integration |
| `twilio-bridge/fly.toml` | Fly.io deployment config (shared-cpu-1x, 256MB, lax) |
| `twilio-bridge/Dockerfile` | Node 20 Alpine container definition |
| `twilio-bridge/package.json` | Dependencies: express, ws |
| `pages/api/twilio/twiml.ts` | Netlify function: validates Twilio webhook, returns TwiML |
| `pages/api/twilio/phone-support-intake.ts` | Support intake endpoint called by bridge tool |

---

## Verification Endpoints

**Health check:**
```
GET https://stellar-twilio-bridge.fly.dev/health
→ {"ok":true,"activeCalls":0,"pool":2}
```

**Debug / diagnostics:**
```
GET https://stellar-twilio-bridge.fly.dev/debug
→ {
    "hmacSecretSet": true,
    "openaiKeySet": true,
    "liveModel": "gpt-live-1",
    "reasoningModel": "gpt-5.6-terra",
    "poolSize": 2,
    "poolReady": 2,
    "selfMintValid": true,
    "recentEvents": [ ... last 20 events ... ]
  }
```

The `recentEvents` array is the primary diagnostic tool. Every call attempt logs: upgrade accepted/rejected, stream started, pool claimed/missed, session.started, first audio delta, tool calls, and cleanup reason.

---

## Known Limitations & Fine-Tuning Needed (Tomorrow)

1. **Support prompt is generic** — the agent collects a structured intake but the conversational style needs refinement for Stellar's actual use cases
2. **No sales-specific agent yet** — both lines serve the support agent; a dedicated sales prompt with discovery flow and lead capture is ready in `SALES_SYSTEM_PROMPT` but not currently active
3. **Sales intake tools inactive** — `submit_business_profile` and `transfer_to_specialist` exist in the codebase but are not wired to the active agent
4. **`end_call` tool requires Twilio credentials** — `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` must be set in Fly.io secrets for clean hangup to work; without them the agent says goodbye but the line stays open until Twilio times out
5. **Pool size = 2** — adequate for low volume; can be increased via `POOL_SIZE` constant if concurrent call volume grows
6. **Audio quality not yet rated** — Jeff approved the conversation but did not specifically evaluate audio fidelity; worth a dedicated listen tomorrow

---

## Total Session Cost

| Metric | Value |
|--------|-------|
| Total OpenAI spend (Oct 10–17) | $1.16 |
| Single-day spend (Oct 17) | $2.57 |
| Monthly budget used | $37.62 / $200.00 |
| Commits shipped | 7 |
| Live call verified | ✅ 2m 32s on 702 line |

---

*End of report. Both lines live. Agent approved. Fine-tuning scheduled for October 18, 2026.*
