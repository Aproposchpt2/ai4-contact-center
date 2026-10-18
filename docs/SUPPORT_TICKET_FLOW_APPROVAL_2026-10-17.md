# Support Specialist — owner approval and ticket conversation flow

October 17, 2026, approximately 16:38 America/Los_Angeles: Jeffery Mitchell reported that the completed call performed very well and approved using that agent for production. This records persona approval; no production rollout or routing change is performed here. Earlier telephone calls had failed the comparison. The exact session associated with this latest owner approval has not been independently correlated.

Railway staging at revision 3140b28 reported runtime voice marin, Live model gpt-live-1 and backend gpt-5.6-terra after the recent call. Those settings and the frozen browser persona are preserved. No explicit replacement voice is selected.

Requested flow is appended as a separate instruction to both Live and delegated Support prompts in staging:

1. After confirming intake details, ask for a moment while creating the support ticket, then actually invoke the tool exactly once.
2. While pending, calmly acknowledge check-ins; never imply completion before the tool result.
3. On success with customerId and caseId, announce creation and ask whether the caller is ready to take down the ticket number. Wait for readiness; respect a decline.
4. Read the exact returned identifier slowly in groups, offer repetition, and ask whether anything further is needed.
5. If yes, continue helping without duplicating the same ticket. If no, use the owner-requested technician follow-up closing only when trusted workflow results explicitly confirm that follow-up. Otherwise use a warm farewell without promising outreach.
6. On failure or blocked writes, say no ticket was confirmed; never invent a number or technician callback.

Staging still blocks database writes, real outreach and transfers. Consequently the success and technician-follow-up paths are not live acceptance-tested here. Enabling an authenticated staging-only persistence adapter and a verified technician follow-up workflow remains separate engineering work. No production change or external notification was made.

Validation: 101 regression tests, TypeScript compilation and server syntax checks passed. These establish configuration/integration regressions only; they do not certify spoken compliance with every new instruction. The original protected browser reference remains unchanged. Next validation is owner audible testing and controlled staging persistence/follow-up tests before production rollout.
