# Voice-Agent Tool Contracts

Every customer agent calls exactly two webhook tools. The agent has no database access; these are its only write path. Both POST JSON to the customer's own workspace.

**URL:** `POST https://{{workspace_host}}/api/intake/webhook`
**Header (required):** `x-ai4cc-intake-key: <the customer's key>`. Missing or wrong key returns `401 {"error":"unauthorized"}`. The key decides which customer's workspace receives the lead; never put a tenant id in the body. Store the key as a secret header, never in the prompt.

## 1. `start_intake`
Call once, early, right after the greeting. Do not tell the caller.

Request body:
```json
{ "action": "start", "conversationId": "<system conversation id>", "callerPhone": "<system caller id>" }
```
Success `201`: `{ "interactionId": "<uuid>" }`. Save it as `intake_interaction_id`.

## 2. `submit_business_profile`
Call once, right before the closing goodbye, when the agent has at least the caller's name, a way to reach them, and the reason for calling.

Request body:
```json
{
  "action": "submit",
  "interactionId": "<intake_interaction_id>",
  "callerName": "Jordan Example",
  "businessName": "",
  "email": "",
  "phone": "",
  "description": "What the caller needs, in their words (required)",
  "serviceInterest": "The service they asked about"
}
```
`interactionId` and `description` are required. Other fields may be empty. Text longer than 2000 characters is cut. Success `201` returns the created lead.

## Errors the agent may see
| Status | Meaning | Agent behavior |
|---|---|---|
| 400 | Missing/invalid `interactionId`, or unknown `action` | Do not retry more than once; close the call politely |
| 401 | Bad or missing key | Configuration problem: close politely; alert the team |
| 404 | Interaction not found | Same as 400 |
| 409 | Already submitted | Treat as success; do not resubmit |
| 500 | Server error | Retry once; if it fails, say a team member will follow up |

## Testing rules
Use fictitious names and numbers only (for example `+15555550100`, `owner@example.invalid`). Delete test leads afterward.
