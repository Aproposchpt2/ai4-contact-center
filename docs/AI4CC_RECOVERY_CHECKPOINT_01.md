# AI4 Intelligent Contact Center — Recovery Checkpoint 01

Status: DEVELOPMENT

## Canonical system boundary

- Operational application: `Aproposchpt2/ai4-contact-center`
- Canonical database: Supabase project `pwvstaigtdrccirdvqka`
- Canonical namespace: `ai4cc_*`
- Backend/API services: `Aproposchpt2/ai-contact-center-os-backend`
- Specialized authoring component: `Aproposchpt2/ai-script-builder`

## Recovered lifecycle

The application lifecycle is being migrated away from local JSON/file state into tenant-scoped Supabase persistence.

Current canonical path:

1. Authenticate with Supabase.
2. Create/generate a flow in Builder.
3. Persist flow to `ai4cc_flows`.
4. Persist immutable versions to `ai4cc_flow_versions`.
5. Validate a saved version using the existing validation engine.
6. Simulate the exact saved version using the existing simulation engine.
7. Deploy a validated version to dev/qa/staging/production using `ai4cc_deployments`.
8. Promote a deployed version between environments.
9. Diff active environment deployments.
10. Roll back environment state using canonical deployment history.
11. Record lifecycle actions in `ai4cc_audit_logs`.

## Acceptance baseline

A controlled database artifact named `AI4CC Development Acceptance Flow` has been seeded for lifecycle acceptance testing. It is development-only and may be removed after the UI lifecycle is proven.

## Preserved engineering assets

The existing validation, simulation, versioning UX, deployment UX, routing concepts, agent-assist concepts, QA/compliance modules, WFM modules, transcript intelligence, and related UI surfaces remain under evaluation. Recovery favors reconciliation and hardening over unnecessary replacement.

## Sale-readiness objective

The governing commercial objective is to prepare AI4 Intelligent Contact Center as a transferable software asset suitable for acquisition, while preserving licensing and white-label optionality. Architecture decisions should therefore favor demonstrable functionality, clean ownership boundaries, portability, documented configuration, and honest capability classification.
