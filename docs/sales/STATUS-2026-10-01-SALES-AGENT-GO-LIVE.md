# Status Update: Sales Agent Go-Live (October 1, 2026)

**Prepared for:** Jeffrey Mitchell, Apropos Group LLC (d/b/a Stellar Unified Communications)

**Covers:** everything since the September 30 evening status update, through the go-live merge at 1:28 PM Pacific on October 1.

---

## 1. Summary

- **The sales agent is live.** The tested sales-v1 branch (prompt v1.16) was merged into the agent's **Main** branch at **1:28 PM Pacific**. The live line, **(725) 330-5102**, now runs it. The test line, (702) 710-2622, runs the same version on sales-v1.
- **Pricing message:** usage-based pricing with **no dollar amounts** spoken (a monthly service fee plus calls handled, estimated from the caller's call history, no overage, no contract). Requests for numbers go to a specialist, or to a callback noted "pricing estimate".
- **Core message (three points):**
    1. 24/7 sales: "Your business may close, while your sales operation stays open 24/7."
    2. A transparent monthly cost.
    3. Multiple calls answered at once.
- **New: caller-ID greeting.** Before the agent speaks, the website looks up the caller ID. A returning caller hears *"Thanks for calling the Intelligent Customer Engagement Operation Center. Am I speaking with Jeffrey?"*
- **New: no made-up callback numbers.** "Same number" now reads back the real caller ID. The website rejects a callback number with no area code.
- **Website changes:** two PRs merged and published (#61, #62). 84 automated tests pass.

---

## 2. Timeline (Pacific time)

| Time | Event |
|---|---|
| 10:05 AM | **Prompt v1.12** published to sales-v1: usage-based pricing with no amounts, 24/7 sales core message, texting included |
| 10:18 AM | **Prompt v1.13**: "multiple calls at once" added as the third core message |
| 10:18–10:32 AM | Three test calls (landscaping, tax prep, law firm). Pitch good; data-capture issues found (section 3) |
| 10:52 AM | **Prompt v1.14** and **PR #61** (returning-caller name from `start_intake`) |
| 10:58 / 11:12 AM | Returning-caller tests: the name came back, but only after the caller's first answer. The agent also invented a callback number ("555-0123") |
| 11:23 AM | **Prompt v1.15** and **PR #62**: initiation webhook endpoint, real caller ID for "same number", short numbers rejected |
| 11:28 AM | PR #62 published on stellaruc.com |
| 12:31 PM | The ElevenLabs setup agent (working from the brief) enabled the conversation-initiation webhook on **sales-v1 only** |
| 12:35 PM | "Same number" test passed: the real number was saved |
| 12:38 PM | Webhook verification call (`conv_3601m3wfjvjwf4ashcv0j7ykr3ss`): all three greeting values received |
| ~12:40 PM | **Prompt v1.16**: first message ends with `{{greeting_question}}` |
| 12:42 PM | Final test (`conv_4101m3wft2w7e2m9709qvkysaw3j`): the first sentence was "…Am I speaking with Jeffrey?" All checks passed |
| 1:28 PM | **sales-v1 merged into Main**. The live line runs v1.16 |

---

## 3. Test-call findings and fixes

| Finding | Fix |
|---|---|
| Agent said "Good to hear from you again" before confirming the name | v1.15: ask "Am I speaking with…?" first; use the name only after a yes |
| Name arrived only after the caller's first answer (lookup ran in `start_intake`) | PR #62 and v1.16: the conversation-initiation webhook looks up the caller ID **before** the agent speaks, so the greeting itself asks for the name |
| Caller said "same number"; agent invented and saved 555-0123 | PR #62: `start_intake` returns the caller ID, and a callback number without an area code falls back to the caller ID. v1.15/v1.16: read back the real number and wait for a yes |
| Agent made up a business name for the demo ("Mitchell Landscaping") | v1.14: say "your company" unless the caller named their business |
| Agent said "since we're within business hours" before a transfer | v1.14: the transfer-hours check stays silent |
| Agent saved during the demo once (tax-prep call) | Prompt rule already in place; it held on every later call. A website-side guard was proposed but not built |
| An interrupted save still wrote an unconfirmed email; a later corrected email was ignored | Known limitation: the website only fills an empty email or phone on a later save. Left as is (see section 6) |

---

## 4. How the caller-ID greeting works

1. A call arrives on Twilio, and ElevenLabs connects it to the agent.
2. **Before the agent speaks**, ElevenLabs POSTs `caller_id`, `agent_id`, `called_number` and `call_sid` to `https://stellaruc.com/api/intake/webhook`. The request is authenticated with the existing intake key (stored in ElevenLabs only).
3. The website looks up the most recently updated contact with that phone number and returns:
   - `known_caller_name`: for example "Jeffrey Mitchell", or empty for a new caller
   - `greeting_question`: "Am I speaking with Jeffrey?", or "What's got you looking into us today?" for a new caller
   - `caller_number`: the caller ID formatted for reading back
4. The first message is *"Thanks for calling the Intelligent Customer Engagement Operation Center. {{greeting_question}}"*.
5. The prompt never reads out anything else from the saved record and never says the number was recognized. It confirms the name as a question, because someone else may be calling from that phone.

---

## 5. Current configuration

| Item | Value |
|---|---|
| ElevenLabs agent | AI4CC Business Intake Agent, `agent_2001m1dc2shfeg48ptr4x2sv8jwg` |
| **Main** (live line (725) 330-5102) | `agtvrsn_6301m3wjeav0ez190tkmykc16z7r`, "Merged from branch sales-v1" (= v1.16) |
| **sales-v1** (test line (702) 710-2622) | `agtvrsn_8801m3wfqzjremfbx5xxphj7486d` (v1.16); kept open for future testing |
| Previous Main (rollback point) | `agtvrsn_9401m3skc5zse2jaw0z3kqqvzypk` (the original intake agent) |
| Voice and model | Eleven v4 Turbo with Expressive Mode; LLM qwen35-397b-a17b; 20-minute call limit; America/Los_Angeles |
| Conversation-initiation webhook | Workspace webhook set to stellaruc.com. Fetching is on for the agent; Main inherited it in the merge |
| Live transfers | Weekdays 8 AM–6 PM Pacific, decided by the website (`transferAllowed`); callback outside those hours |
| Website | stellaruc.com on Netlify, main at `e719511` (#62) plus #63 (homepage, Marketing agent) |
| Prompt source | `docs/sales/SALES-AGENT-PROMPT-V1.md` (v1.16) |
| Setup brief | `docs/sales/ELEVENLABS-CALLER-ID-GREETING-BRIEF.md` |

### Rollback (if the live line misbehaves)

- **Fastest:** in ElevenLabs, open the agent → Main → Versions, and restore `agtvrsn_9401m3skc5zse2jaw0z3kqqvzypk`. Or ask Claude to do it.
- If only the greeting misbehaves, the fallback is a v1.15-style first message ("…What's got you looking into us today?"). The name then comes from `start_intake` after the first answer.

---

## 6. Known limitations (accepted for now)

- **Contacts are matched by caller ID.** All test calls from one phone attach to one contact (display name "Jeffrey Mitchell"). Per the owner's decision this stays as is.
- **Later saves fill only empty fields.** A contact that already has an email keeps it. A new email given on a later call is stored on that call's lead, not the contact.
- **Test data in production:** test leads from today (tax-prep, law-firm, tire-shop and others) and one contact with the phone "5550123" from the invented-number call. A cleanup was offered but not run.
- **Webhook dependency:** the greeting depends on stellaruc.com answering the initiation webhook. If it doesn't, ElevenLabs uses the placeholder greeting ("What's got you looking into us today?"). Behavior during an outage hasn't been tested.
- **Unkeyed intake calls are still allowed** (`AI4CC_INTAKE_ALLOW_UNKEYED` is not yet `false`). See section 8.

---

## 7. Pull requests (repo `Aproposchpt2/ai4-contact-center`)

| PR | Title | Status |
|---|---|---|
| #58 | Lead quality: filler stripping, late email/phone fill | Merged September 30 |
| #59 | Transfer window decided by the website | Merged September 30 |
| #60 | StellarUC homepage: 24/7 sales and usage-based pricing (Marketing agent) | Merged October 1 |
| #61 | Greet returning callers by name; prompt docs v1.11–v1.14 | Merged and published October 1 |
| #62 | Caller-ID greeting webhook; never save a made-up callback number | Merged and published October 1 (11:28 AM) |
| #63 | Homepage connected to customer lifecycle and staff workspace (Marketing agent) | Merged October 1 |

---

## 8. Open items

**Owner**

1. Set `AI4CC_INTAKE_ALLOW_UNKEYED=false` in Netlify. The ElevenLabs tools and webhook already send the key.
2. Enable ElevenLabs usage-based billing and move to the Pro plan when customer #1 signs.
3. Twilio auto-recharge and a TwiML fallback for the numbers.
4. DBA registration, Terms of Service and Privacy Policy, insurance quote.
5. Delete the old duplicate agent in ElevenLabs.
6. Finalize the static monthly fee (working figure $500, not locked) once all vendor costs are confirmed.

**Engineering (offered, not started)**

- Clean up today's test leads and the "5550123" contact.
- Website-side guard against saving before a phone number is confirmed.
- Update Sales Knowledge Base section 35 to usage-based pricing when the numbers are final.
- Pricing spreadsheet tab "Usage Pricing / Static Fee & Scaling".
- Webhook latency check.
