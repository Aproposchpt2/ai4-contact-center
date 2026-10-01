# Brief: Turn on the caller-ID greeting for the ElevenLabs sales agent

**Owner:** Jeffrey Mitchell, Apropos Group LLC (d/b/a Stellar Unified Communications)
**Goal:** when a returning caller dials the sales test line, the agent's first sentence greets them by the name saved from their earlier call:
*"Thanks for calling the Intelligent Customer Engagement Operation Center. Am I speaking with Jeffrey?"*
**Your scope:** ElevenLabs settings only (steps 1–3). The website side is already built. The prompt and first-message changes are made afterwards by the Claude Code session that built the website side. Report back when you've finished step 3.

---

## Background (how it works)

1. A call arrives on the test line, which runs on Twilio.
2. **Before the agent speaks**, ElevenLabs POSTs to our website's *conversation initiation webhook* with the caller ID.
3. The website looks up the caller ID among saved contacts and returns dynamic variables.
4. Later, the agent's first message will use `{{greeting_question}}`. The Claude session makes that change after you finish.

**Request ElevenLabs sends (standard format):**
```json
{ "caller_id": "+17025550100", "agent_id": "agent_...", "called_number": "+17027102622", "call_sid": "CA..." }
```

**Response our website returns:**
```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "known_caller_name": "Jeffrey Mitchell",
    "greeting_question": "Am I speaking with Jeffrey?",
    "caller_number": "702-555-0100"
  }
}
```
A new caller gets `known_caller_name: ""` and `greeting_question: "What's got you looking into us today?"`.

---

## Identifiers

| Item | Value |
|---|---|
| Agent | **AI4CC Business Intake Agent**, `agent_2001m1dc2shfeg48ptr4x2sv8jwg` |
| Test branch (**change this one only**) | **sales-v1**, `agtbrch_5101m3sjyz4cfscsmp74x7gs5h81` |
| Test phone line | (702) 710-2622, label "SALES TEST LINE", `phnum_7701m3t3hchde47b5mf3ydpg0wy7` |
| Main branch (**do not change**) | `agtbrch_9901m1dc2vpyet58pkdevkhsda4a`, which runs the live line (725) 330-5102 |
| Webhook URL | `https://stellaruc.com/api/intake/webhook` (method POST) |
| Auth header | `x-ai4cc-intake-key`, with the **same value** already set on the agent's `start_intake` tool header |

---

## Before you start

- Jeffrey confirms that **PR #62** ("Caller-ID greeting webhook…") is merged **and published** on stellaruc.com. Without it, the webhook URL won't return the greeting variables.

## Step 1: Set the workspace webhook

In ElevenLabs: **Agents Platform → Settings** (workspace level), section **"Conversation initiation client data webhook"**.

1. URL: `https://stellaruc.com/api/intake/webhook`
2. Add the request header `x-ai4cc-intake-key`. For its value, copy the header value from the `start_intake` tool (Agent → Tools → start_intake → Headers). Store it as a **workspace secret** if the UI offers that.
3. Save.

This setting is shared by the whole workspace, but only agents or branches that enable step 2 call it.

## Step 2: Enable fetching on the sales-v1 branch only

1. Open the agent and switch to the **sales-v1** branch.
2. Go to **Security** (or Advanced), find **"Fetch conversation initiation data for inbound Twilio calls"**, and turn it **on**.
   - API equivalent: `platform_settings.overrides.enable_conversation_initiation_client_data_from_webhook = true` on branch `agtbrch_5101m3sjyz4cfscsmp74x7gs5h81`.
3. Publish that branch change.
4. Switch to the **Main** branch and confirm the same setting is still **off**.

**STOP and report back, without continuing, if:** the toggle can't be set per branch (turning it on for sales-v1 also turns it on for Main), or the UI forces any other change to Main. The live line must not depend on this webhook yet.

## Step 3: Verify, without changing the first message or prompt

1. Ask Jeffrey to call **(702) 710-2622** from his phone. The call should connect and sound normal; the greeting won't change yet.
2. In **Conversations**, open that call. Under the conversation's initiation data or dynamic variables, confirm all three are present:
   - `known_caller_name`: should be "Jeffrey Mitchell"
   - `greeting_question`: should be "Am I speaking with Jeffrey?"
   - `caller_number`
3. Optional: place one call to the live line, (725) 330-5102, and confirm it behaves as before, with no initiation data.

**If the test call fails to connect or the variables are missing:** turn the step 2 toggle **off** again (this is the rollback), note any error ElevenLabs shows, and report back.

---

## Do not

- **Do not paste the intake key value** into any document, ticket, chat message or note. Copy it only between ElevenLabs fields.
- Do not change the first message, system prompt, tools, transfer settings, voice, or phone-number assignments. The Claude session will set the first message to use `{{greeting_question}}` after you report back. Changing it before the webhook works makes calls fail on a missing variable.
- Do not change anything on the **Main** branch or in Twilio.

## Report back to Jeffrey

1. Done or blocked, and on which step.
2. The conversation ID of the verification call (starts with `conv_`).
3. The three dynamic-variable values you saw.
4. Confirmation that the setting on Main is still off.
