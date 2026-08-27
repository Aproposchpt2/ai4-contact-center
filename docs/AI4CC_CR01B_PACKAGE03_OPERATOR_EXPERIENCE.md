# AI4CC CR-01B Package 03 — Operator Experience Completion

## Status
IMPLEMENTATION WORKSTREAM OPEN

## Purpose
Complete the operator-facing Lead Management workflow now that CR-01B Package 01 lifecycle authority and Package 02 Activity + Task authority are production-validated.

Package 03 is presentation/orchestration work over the existing canonical authorities. It must not create a second CRM, task store, activity store, routing authority, or polling service.

## Canonical authorities preserved
- `public.ai4cc_leads`
- `public.ai4cc_lead_activities`
- `public.ai4cc_lead_tasks`
- `public.ai4cc_contacts`
- `public.ai4cc_agents`
- `public.ai4cc_audit_logs`
- `public.ai4cc_update_lead_lifecycle(...)`
- `public.ai4cc_record_lead_activity(...)`
- `public.ai4cc_manage_lead_task(...)`

## Package 03 operator objectives
1. Make Lead Management the primary operator entry point for the CRM workflow.
2. Provide explicit navigation from a selected Lead to Activity + Task Operations using the canonical Lead UUID.
3. Preserve return navigation from Activity + Task Operations to the same Lead lifecycle record.
4. Add operator-friendly Lead search/filter controls without changing persistence authority.
5. Surface actionable lifecycle state clearly: pipeline stage, priority, assigned Agent, next action, next follow-up, value and probability.
6. Preserve deliberate terminal controls for WON / LOST and current RBAC behavior.
7. Preserve manual refresh only. No heartbeat, polling, realtime subscription, or background refresh.
8. Preserve the accepted AI4 institutional header and mobile/tablet navigation baseline.
9. Preserve CR-01A interaction -> Contact -> Lead creation unchanged.
10. Preserve Voice, SMS and Web Chat runtime behavior unchanged.

## Acceptance requirements
- Lead Management remains readable and usable on desktop, tablet and mobile.
- Selected Lead can open Activity + Task Operations without manually copying a UUID.
- Activity + Task Operations opens the intended canonical Lead.
- Returning to Lead Lifecycle preserves the intended Lead selection.
- Lead search/filter is client-side over the already-loaded tenant-scoped Lead collection unless a justified canonical server query is required.
- No automatic refresh interval or realtime subscription is introduced.
- Existing Package 01 and Package 02 RPC/RBAC boundaries remain unchanged.
- Deploy Preview builds successfully with zero secret-scan matches.
- Production merge commit is verified after acceptance.

## Explicitly out of scope
- Customer 360 / Contact Intelligence (CR-01C)
- new Lead schema
- new Task schema
- new Activity schema
- new database mutation functions unless a concrete defect is discovered
- changes to Twilio Voice/SMS or Web Chat runtime
- analytics redesign
- background monitoring

## Current baseline
Package 01: ACCEPTED / CLOSED / PRODUCTION-VALIDATED

Package 02: ACCEPTED / CLOSED / PRODUCTION-VALIDATED

AI4CC-UI-NAV-001: FIX VERIFIED / CLOSED
