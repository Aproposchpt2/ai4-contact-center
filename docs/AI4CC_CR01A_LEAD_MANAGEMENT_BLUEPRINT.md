# AI4CC CR-01A — Native Lead Management + Customer Intelligence Blueprint

Status: IMPLEMENTED ON CONTROLLED BRANCH / NOT YET PRODUCTION

## Governing boundary

AI4CC remains the only authority for Voice, SMS, Web Chat, interactions, routing, queues, agents, transcripts, Agent Assist, QA, compliance, audit, flow deployment, temporal routing, and voicemail.

FlowDesk Pro is a source of domain concepts only. Its parallel call, SMS, staff, client tenancy, and privileged dashboard implementations are not imported.

## Native AI4CC domain

- `ai4cc_contacts` — customer/prospect identity and consent attributes.
- `ai4cc_leads` — pipeline, score, priority, value, probability, stage, ownership, next action.
- `ai4cc_lead_activities` — immutable-style business lifecycle events linked to interactions where applicable.
- `ai4cc_lead_tasks` — follow-up work and due dates.

## Canonical lineage

A lead created from a Contact Center event retains:

- tenant_id
- contact_id
- originating_interaction_id
- originating_channel
- originating_queue_id
- originating_agent_id
- assigned_agent_id

The interaction is not copied into a CRM call/SMS/chat table.

## Security model

- API tenant is derived through `requireAi4ccContext()`.
- Browser callers cannot choose another tenant.
- New tables use tenant RLS through existing `ai4cc_private.is_tenant_member` authority.
- Service-role credentials remain server-side.
- Duplicate lead creation from the same originating interaction is rejected by the API.

## Initial pipeline

`new → qualified → contacted → follow_up → opportunity → converted`

Alternative terminal/holding states:

- `lost`
- `nurture`

## Initial UI

Route: `/lead-management`

Capabilities in CR-01A:

- tenant-scoped lead list
- pipeline metrics
- pipeline value
- create lead from an existing canonical AI4CC interaction
- preserve channel/queue/agent lineage
- stage changes
- audit and activity records
- manual refresh only

## Explicitly deferred

- automatic lead creation rules
- contact deduplication beyond exact email/phone reuse
- scoring model tuning
- task editing UI
- activity timeline UI
- campaigns
- outbound sequencing
- subscriptions/entitlements
- billing
- production migration application

These belong in controlled follow-on passes after CR-01A validation.
