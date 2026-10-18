# Support ticket silence investigation — October 17, 2026

Owner reports the agent is suitable except for an extended wait before ticket confirmation. No production changes authorized/performed here.

## Verified live staging evidence
Ticket 07b6ed97-4454-4569-bbc9-6f15761356b2 exists in staging project hvzauakkhlivzeqatfqm, tenant 5885a020-d363-4c27-910a-c035eda132f5. Exactly one case for the intake session, test_only=true, linked customer 240edfe6-b17b-4435-8d07-89f4c306d52d belongs to that tenant. This matches the ticket suffix visible in the owner's screenshot.
Database creation: 2026-10-18T00:45:47.916932Z. Spoken confirmation transcript events start at 00:45:49.622Z. Event receipt timing is not an audio playback measurement or exact database request duration.
Earlier output transcript events at 00:44:16 and 00:45:03 describe waiting although the save happened later. The long wait therefore includes time before submission; database latency alone does not explain it. Logs also show an initially incorrect spoken identifier around 00:45:56, followed by the correct identifier around 00:46:31. Ticket-number fidelity is a remaining acceptance concern.

## Targeted staging corrections
Preserve the original frozen persona, models, default voice, greeting, natural full-duplex handling and database restrictions. Append instructions to promptly invoke saving after complete confirmed intake, and never describe saving as pending before actual application submission.
At tool execution start, send Live a session.commentary.append describing the real pending state. If still unresolved after four seconds, send one patience update. Cancel it on completion/disconnect; no stale pending updates after completion. The existing database timeout remains ten seconds; no automatic retry of uncertain writes.
On verified success, directly send Live the actual caseId through session.thinking.append and a session.instructions.append to confirm creation and ask readiness before reading the exact identifier. Continue returning the correlated tool result to Responses. On failure send a direct no-ticket-confirmed instruction without inventing an ID. Add non-sensitive save duration/status metrics; no credentials or caller details added to metrics.
These commands provide application-verified context, not a guarantee of spoken compliance. The API manages speech independently of delegated backend work. Reference: https://developers.openai.com/api/docs/guides/live-conversations

## Validation and next acceptance
108 automated tests and TypeScript/syntax checks passed. New tests cover actual pending status, a slow pending reminder, no success before result, exact verified ID context before backend continuation, failed saves and disconnect suppression.
Audible silence reduction, exact ticket-number speech and repeated-call behavior for this revision remain unexecuted. Run one fictional staging call, verify number spoken versus database, evaluate waiting transitions and absence of stale reminders. Production remains NO-GO for this unresolved reliability condition; owner persona approval remains recorded separately. Notifications and real technician outreach remain disabled.
