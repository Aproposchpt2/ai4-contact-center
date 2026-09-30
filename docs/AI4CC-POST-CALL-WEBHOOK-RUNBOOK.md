# AI4CC Post-Call Webhook Runbook

`POST /api/intake/post-call` records every voice call's end from ElevenLabs, whether or not the
agent ever invoked the intake tools. It closes the gap where a caller who hung up before intake
`start` left no CRM record (conversation `conv_6001m3sam03rexarsv4qr04qnfgc`, 2026-09-30).

## What it does
- Verifies `ElevenLabs-Signature` (HMAC-SHA256 over `<t>.<raw body>`, 30-minute tolerance).
- Maps the signed `agent_id` (and optionally the called number) to a tenant through
  `ai4cc_integrations`; unbound agents are acknowledged with 200 and not stored.
- Calls `ai4cc_record_voice_call_event`, which creates or reconciles one interaction per
  conversation, never creates a lead, and writes one `interaction.call_ended` (or
  `interaction.call_initiation_failed`) audit. Duplicates return `replayed: true`.

| Existing state | Result |
| --- | --- |
| No interaction (hangup before intake) | New `abandoned` interaction, `intakeOutcome=not_started` |
| Open intake, not submitted | `abandoned`, `intakeOutcome=incomplete`, provider end time |
| Closed by 60-minute cleanup | Provider end time replaces cleanup time; `cleanupEndedAt` kept |
| Completed intake with lead | Status, end time, lead and contact unchanged; call details attached |
| Initiation failure | `failed` interaction |

`endTimestampSource` is `provider` when the event carried start and duration, otherwise
`webhook_receipt`. A valid intake submit that lands after the post-call event still completes
the interaction and keeps the provider end time.

## Wiring (in order)
1. Apply `supabase/migrations/20260930160000_ai4cc_voice_call_lifecycle.sql`.
2. In ElevenLabs, create a post-call webhook pointing at
   `https://stellaruc.com/api/intake/post-call` with HMAC authentication, enable
   transcription and call-initiation-failure events (audio is ignored), and copy its secret.
3. Set `ELEVENLABS_WEBHOOK_SECRET` in Netlify (server-side only) and redeploy. Until it is
   set the endpoint returns 503.
4. Confirm the agent ID actually assigned to the phone number, then bind it:
   ```sql
   insert into public.ai4cc_integrations(tenant_id,provider,integration_type,display_name,status,config)
   values('<tenant uuid>','elevenlabs','post_call_webhook','ElevenLabs post-call webhook','active',
     jsonb_build_object('agent_id','<agent id>','agent_number','+17253305102'));
   ```
   `agent_number` is optional; when present, events from other numbers are ignored.

## Verification
- `supabase/tests/voice_call_lifecycle.sql` (transaction-scoped, rolled back).
- `tests/postCallWebhook.test.mts` (signature, binding, normalization, error handling).
- Live: one early-hangup call, then check the interaction by `external_id` = conversation ID,
  its `callLifecycleOutcome`, `providerEndedAt`, no lead, and one audit row. Re-send the event
  from ElevenLabs to confirm `replayed: true`, and send one with a bad signature to confirm 401.
