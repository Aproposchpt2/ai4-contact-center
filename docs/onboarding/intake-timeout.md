# Voice intake timeout handling

Voice intake starts are stored as open interactions. A call that never submits contact details must not remain open indefinitely or be represented as a successfully captured lead.

The `ai4cc-intake-timeout` database job runs once a minute. It closes up to 100 voice interactions per run when they are still open, have no end time or linked lead, come from the ElevenLabs intake path, and started more than 60 minutes ago. It skips locked rows so submission and cleanup cannot modify the same interaction simultaneously.

These interactions become `abandoned`. The metadata and audit identify the reason as `submission_timeout` and the end timestamp source as `timeout_cleanup`. The timestamp records cleanup, not an independently verified telephony hang-up. Recent interactions, active calls, completed calls, other providers, and interactions with leads are excluded.

If a valid submission arrives later, the atomic intake RPC can recover this specific timeout state. Completion, contact capture, lead creation, and recovery audit commit together. Replays return the same lead. An unrelated abandonment or failure remains terminal.

Operators should review these rows as incomplete intake attempts. Do not contact a caller or create a lead solely because a timeout occurred. Monitor `cron.job_run_details` for job failures and `interaction.intake_timed_out` and `interaction.intake_recovered` audit events for reconciliation.

Tests: `supabase/tests/voice_intake_timeout.sql` covers expiration, exclusions, audit idempotence, and late recovery. The database timeout is a fallback and does not constitute acceptance of provider hang-up events, call transfers, or other unexecuted VAR scenarios.
