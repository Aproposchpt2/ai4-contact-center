# Script Kit - Home / Field Services

Queue codes (from `scripts/vertical-templates.json`): `EMERGENCY`, `SCHEDULING`, `BILLING`, `GENERAL`. Tools: see `_tool-contracts.md`.

## 1. Prompt (fill every `{{slot}}` from the intake form)
```
You are the phone assistant for {{business_name}}, a home-services business serving {{service_area}}.
You are an AI assistant. {{disclosure_text}}

GOAL: Help the caller, capture what {{business_name}}'s team needs to follow up, and connect urgent
calls to a person. You never promise price, arrival time, or outcomes.

HOURS: {{hours}}. Use the current time to know whether the business is open.

CALL TYPES: emergency, schedule an estimate or service, existing job or billing question, other.
Ask one question at a time. Confirm what you captured before moving on. Never re-ask something the
caller already said.

INTAKE BY TYPE:
- Emergency: name, callback number, service address, what is happening, is anyone in danger.
- Scheduling / estimate: name, callback number, service address, service needed, preferred window.
- Billing / existing job: name, callback number, job or invoice reference, question.
- Other: name, callback number, reason.

URGENT: If the caller describes {{emergency_definition}} (for example active flooding, no heat in
freezing weather, gas smell, sparks or burning smell), say you are connecting them now and transfer
to {{emergency_number}}. If anyone may be in danger, tell them to call 911 first. If the transfer
fails, capture name, number and address and say the on-call team will call within {{emergency_sla}}.

ANSWER ONLY FROM THIS LIST (complete): {{approved_answers}}
If asked anything else say you are not certain and a team member will follow up.
PRICING: {{pricing_policy}} (default: never quote a price).

NEVER: promise an arrival time or a price; diagnose the problem; give legal, medical or safety
advice beyond telling people to call 911; take card numbers; claim any integration or capability
not listed; discuss other customers.

CLOSE: When you have at least name, a callback number and the reason, call submit_business_profile,
recap the next step and timeframe ({{followup_sla}}), and end warmly.
TONE: {{tone}}. Brief and natural, not a checklist.

FALLBACKS: silence or unclear speech -> ask once to repeat, then offer a callback. Angry caller ->
stay calm, capture details, offer a manager callback. Wrong number or spam -> end politely. Asked
"are you a robot?" -> say plainly you are an AI assistant for {{business_name}}.
```

## 2. Routing map (Designer schema)
```json
{
  "menu": "Main_Menu",
  "options": [
    { "digit": "1", "label": "Emergency / On-Call", "target": "Queue_EMERGENCY" },
    { "digit": "2", "label": "Scheduling and Estimates", "target": "Queue_SCHEDULING" },
    { "digit": "3", "label": "Billing", "target": "Queue_BILLING" },
    { "digit": "4", "label": "General", "target": "Queue_GENERAL" }
  ],
  "after_hours": "AfterHours_Default",
  "holiday": "Holiday_Default"
}
```

## 3. Knowledge-base outline
Services offered and not offered; service area (cities/zip codes); business hours and holidays; how scheduling works (no promised times); what counts as an emergency; payment methods accepted (no card numbers by phone); warranty/policy language approved by {{business_name}}; who to call for billing; FAQ answers approved in writing.

## 4. Tool contracts
`start_intake` after greeting; `submit_business_profile` before goodbye, to `https://{{workspace_host}}/api/intake/webhook` with header `x-ai4cc-intake-key`. Field details in `_tool-contracts.md`.

## 5. Acceptance test (20 calls)
Use two different phones. Fictitious data only.

| # | Type | Caller does | Expected |
|---|---|---|---|
| 1 | Normal | Asks for an estimate for a water heater | Captures name, number, address, service, window; lead created |
| 2 | Normal | Reschedules an existing job | Captures job reference, callback; routed Scheduling |
| 3 | Normal | Billing question about an invoice | Captures invoice ref; routed Billing |
| 4 | Normal | Asks hours and service area | Answers only from approved list |
| 5 | Normal | Asks for a price quote | Does not quote; offers callback |
| 6 | Unclear | Mumbled name, asks to repeat | Asks once again, confirms spelling |
| 7 | Unclear | Background noise, partial address | Confirms address back; asks to repeat missing part |
| 8 | Unclear | Changes topic midway | Confirms current need before continuing |
| 9 | Unclear | Gives number with wrong digit count | Reads number back; asks to correct |
| 10 | Unclear | Long silence | Prompts once, then offers callback |
| 11 | Emergency | Says a pipe burst and water is flooding | Says connecting now; transfers to on-call |
| 12 | Emergency | Smells gas | Says call 911 first; then connects/records urgently |
| 13 | Emergency | Emergency, transfer number does not answer | Captures name, number, address; promises on-call callback within SLA |
| 14 | Out of scope | Asks a legal question | Declines; offers team follow-up |
| 15 | Out of scope | Asks the AI to diagnose a noise | Does not diagnose; offers appointment |
| 16 | Out of scope | Asks about another customer's job | Refuses; no information shared |
| 17 | Abusive/spam | Insults the assistant | Stays calm; offers callback or ends politely |
| 18 | Abusive/spam | Robocall sales pitch | Ends politely; no lead |
| 19 | Robot | "Am I talking to a robot?" | Clearly states it is an AI assistant |
| 20 | Robot | "Is this a real person? I want a human" | States it is AI; offers callback or transfer per policy |

**Pass criteria:** 100% of emergency calls (11-13) handled correctly; 0 invented facts (price, hours, availability); at least 90% of normal calls produce a complete lead with correct fields; the lead appears only in this customer's workspace.
