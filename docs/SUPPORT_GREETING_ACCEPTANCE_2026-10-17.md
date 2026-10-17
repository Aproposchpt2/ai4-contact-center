# Support greeting startup acceptance — 2026-10-17

## Owner-approved conversational baseline
Jeffery Mitchell confirmed during the protected Support Specialist preview conversation: “This is the Agent I must have.” Preserve this experience while repairing telephone startup. This approval is for conversational quality; it is not evidence of complete transaction acceptance or authorization to deploy to production.

- Protected preview: https://deploy-preview-73--stellaruc-private-voice-poc.netlify.app/experimental-support-voice
- Verified deployed source baseline: b8ce29ad04261134e45491c85a42acb0ce038f27 (PR #73).
- Session configuration source: pages/api/experimental-support-voice-session.ts at that commit.
- Configured voice model: gpt-live-1; delegated reasoning: gpt-5.6-terra.
- No explicit voice identifier is set in that session source; the selected runtime voice remains unverified. Do not invent or substitute one.
- Source instructions and tools must be preserved and compared when integrating the telephone path. The browser path uses WebRTC; telephone uses WebSocket/PCMU, so matching model IDs does not establish matching behavior.
- Owner transcript: stellaruc-css-transcript-1792255476296.json; SHA-256 c81b2d03efbf1522542952dc96cd0a2466df196a36020b1b15fe9498c4ebb573.
- Exported 2026-10-17 16:44:36 UTC. Transcript fragments span 16:39:09–16:44:31 UTC. These are transcript delivery timestamps, not measured call-connect or audible latency.
- Voice transcript ends with the representative stating that the record was not confirmed and no case number was available. Do not mark voice-to-case persistence PASS.
- Separate no-voice staging write verified case 825a7024-8eaf-419b-87f4-2e63f69b5b2a, linked contact b0964f1c-7384-4ff5-9c75-9069cd61a485, exactly one case for its session, test_only=true, no notification sent.

## Startup defect and isolated change
Owner reports having to speak repeatedly before the telephone agent responds. The inspected bridge at 15248e6 releases buffered caller audio before requesting the greeting; speech detection then cancels output and clears telephone audio. This is a reproducible ordering risk, not a claim that historical production logs have proven the exact cause.

Draft PR #75, repair/support-greeting-startup-20261017, is stacked on PR #74's isolated repair branch. No production merge or deployment is authorized.

1. Request the greeting exactly once on session.started without requiring caller input.
2. Hold caller input until Twilio acknowledges playback of the first greeting audio chunk. A mark is sent directly after that first chunk. Ignore unsolicited, other-stream and duplicate marks.
3. Before playback acknowledgement, speech events cannot cancel/clear the opening greeting. After acknowledgement, replay buffered input in order and restore normal interruption.
4. Fail startup after ten seconds without playback acknowledgement; stop instead of silently dropping audio when the bounded startup queue exceeds capacity.
5. Ignore late messages after disconnect and avoid restarting on duplicate stream/session starts.
6. Log stream-to-session, first output and first-chunk playback timings without logging audio or credentials. This does not measure the earlier dial/answer/webhook portion of the call.

Twilio mark semantics: https://www.twilio.com/docs/voice/media-streams/websocket-messages
A mark normally acknowledges preceding audio playback; clear also returns pending marks. This implementation does not send clear before the opening mark is acknowledged.

Production-mode model defaults, prompts and routing are unchanged. Railway staging now selects the exact approved browser Support brief and delegated instructions, with the same configured model pair. No explicit voice selection was introduced. Audio transport remains different and audible equivalence still requires owner acceptance. Tool schemas retain the telephone interface; staging persistence is deliberately disabled until a protected staging adapter is verified.

## Verification
- All 98 local regression tests PASS.
- Eleven mocked bridge runtime tests PASS, covering silent caller on warm/cold sockets, early speech, ordered replay, interruption after playback starts, invalid/duplicate marks, missing audio/acknowledgement, bounded-buffer overflow and disconnect before session readiness.
- TypeScript compilation PASS.
- Bridge JavaScript syntax and diff whitespace checks PASS.
- Next.js optimized build PASS locally. GitHub did not return a pull-request workflow run for this stacked branch at the time checked; do not imply remote CI has passed.
- No live telephone test, production write, production routing change, or paid infrastructure provisioning performed for this patch.

## Railway staging preparation and remaining gates
Owner selected Railway as the production bridge destination and authorized up to $5 for initial staging hosting. No production migration is authorized.

- Connected account: aproposchpt2.
- Private project: stellaruc-voice-bridge (1d66a7cf-3cb9-4032-958b-c897137fcece).
- Environment: staging (95040de1-e96f-43d5-b5fa-39e8c0911e9e).
- Pending service: stellaruc-voice-bridge-staging (6bda5718-49a2-4524-8b4d-af906c3be2f0).
- Bridge code revision: 346f337c4ea3aab022d0330deecf466849d47268; root /twilio-bridge, Dockerfile, node server.js, health /health.
- Source/configuration/variables are staged, not deployed. No public domain exists yet.
- Staging mode follows STELLAR_BRIDGE_STAGING=true or Railway environment name staging. It blocks database/API intake writes, customer notifications, external Twilio hangup/transfer calls, and protects /debug with bearer authentication. The side-effect blockers apply even if production URLs or credentials are accidentally supplied.
- One concurrent test session, maximum two minutes. No production Twilio credentials are required or configured.
- A separate bridge authentication secret was generated and staged without disclosure.
- OPENAI_API_KEY is missing on Railway at the last presence-only inspection. The existing private Netlify key is masked and cannot be transferred through the connector. Owner will enter the existing authorized key directly in Railway Variables.
- Resource limits could not be staged before a service instance exists (connector returned Service Instance not found); no running instance exists. Set and verify per-service limits once possible, and monitor usage within the approved $5 budget. No billing cap has been configured or claimed.
- No new Railway database, storage volume, customer number or subscription upgrade was created.

Next: securely configure the existing OpenAI key, verify pending changes, deploy staging and observe terminal SUCCESS, verify exact deployed SHA and protected endpoints, then run brief greeting/transport tests. A real telephone test still needs authorized test routing that does not alter live customer numbers. Staging writes must remain blocked until a staging-only authenticated persistence adapter and notification controls are verified. Real voice-to-case acceptance remains pending.

Rollback: before any authorized staging deployment, record that staging host's current image/release and environment-name inventory (no values). Restore that prior staging image/release if checks fail. Existing production remains untouched.

Recommendation: NO-GO for production until isolated telephone and transaction acceptance passes and the owner explicitly authorizes launch.
