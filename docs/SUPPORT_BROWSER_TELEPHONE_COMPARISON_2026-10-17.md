# Support browser-to-telephone comparison — October 17, 2026

Status: owner-approved browser reference recovered; telephone equivalence NOT accepted.

## Reference protected browser
Deploy 6ad3980df96ea24ea1f5c11d, commit b8ce29ad04261134e45491c85a42acb0ce038f27.
https://6ad3980df96ea24ea1f5c11d--stellaruc-private-voice-poc.netlify.app/experimental-support-voice
Owner confirmed preferred voice, calm demeanor, helpfulness and conversation on October 17 at approximately 16:10 America/Los_Angeles.
Do not modify this reference deployment or its source to tune telephone behavior.
Transcript stellaruc-css-transcript-1792278458639.json SHA256 e90b4971287319f540751544dde7cc917997cc47efac7d12bf502aa0d8fec94a. Transcript has no resolved voice ID or audio recording.

## Comparison
| Setting | Approved browser | Railway staging |
| --- | --- | --- |
| Live model | gpt-live-1 | gpt-live-1 (runtime startup verified) |
| Reasoning model | gpt-5.6-terra | gpt-5.6-terra (startup verified) |
| Voice | Omitted, provider default | Omitted, provider default; resolved voice not yet observed |
| Transport | WebRTC, negotiated codec | Twilio WebSocket, PCMU 8kHz |
| Persona | Frozen original brief and detailed instructions | Same strings, separate requested greeting prefix |
| Turn settings | Provider defaults | Provider defaults for staging Support |
| Caller speech | Managed by Live | Previously cleared playback and cancelled backend work on speech detection; staging Support now leaves full-duplex handling to Live |
| Tool calls | Completed response.output_item.done inside response.event | Corrected staging Support to the same completed-item dispatch; partial arguments do not execute |
| Persistence | Authenticated operator confirmation, staging RPC | Intentionally blocked by STAGING_WRITES_DISABLED |
| Knowledge base | No retrieval tool configured | No retrieval tool configured |

The documented current default voice is marin. This is an inference about the omitted configuration, NOT recovered runtime evidence from the approved browser session. No alternative voice or model selected.
References: https://developers.openai.com/api/docs/guides/live-conversations and https://developers.openai.com/api/docs/guides/live-delegation

## Staging database evidence (read-only verification)
Project hvzauakkhlivzeqatfqm; tenant 5885a020-d363-4c27-910a-c035eda132f5.
Case c868824e-b6d1-4682-93c2-1b1b817d1a2b exists, test_only=true, source=private_voice_test.
Created 2026-10-17T23:06:02.061122Z, before transcript confirmation beginning 23:06:03.685Z.
Linked contact b0964f1c-7384-4ff5-9c75-9069cd61a485 exists in the same tenant; contact test_only=true.
Exactly one case for that tenant/intake_session_id. No database writes performed during verification.
No notification delivery or knowledge-base lookup acceptance claimed.

## Validation and next test
101 automated regression tests passed; TypeScript compilation and server syntax passed.
New tests cover full-duplex speech without backend cancellation, complete function-item execution, correlation, duplicate protection, and retained staging write blocks.
Small non-sensitive supportRuntime metadata is exposed on staging health from provider session lifecycle events: model, voice, format, backend model only. Null means not reported; no full session object, credentials, transcripts, or caller IDs retained there.
Next owner test: call ONLY staging (725) 201-0584 in a quiet room, compare voice/calmness to browser, interrupt politely during a reply, correct one detail, and confirm she resumes coherently. Telephone writes remain blocked and she must report no case confirmed.
Audio equivalence, runtime voice readback, latency after interruption and live telephone tool completion remain unexecuted for this revision.

## Controls and recovery
Only repair/restore-approved-support-20261017 and Railway staging are changed. Production, main, telephone routing, original preview, active models and credentials remain unchanged.
Prior known staging revision a31714af6c9074445b70b4b8b03b93e004652b19 is available to repin in this staging environment if the owner reports a regression.
Production recommendation remains NO-GO until audible owner acceptance and remaining functional/security acceptance tests pass.
