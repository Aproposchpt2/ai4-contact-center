# AI4CC CR-01C — Customer 360 / Contact Intelligence

## Status
PACKAGE 01 IMPLEMENTATION IN PROGRESS

## Purpose
Turn the existing canonical `ai4cc_contacts` identity into a unified operator-facing Customer 360 without creating a parallel CRM or duplicating Voice, SMS, Web Chat, Lead, Activity, Task, Agent, Queue, or Audit authority.

## Governing boundary
AI4CC remains the authority for all contact-center runtime records. Customer 360 is an aggregation and operator-context layer over existing canonical records.

### Canonical authorities
- `public.ai4cc_contacts`
- `public.ai4cc_interactions`
- `public.ai4cc_leads`
- `public.ai4cc_lead_activities`
- `public.ai4cc_lead_tasks`
- `public.ai4cc_agents`
- `public.ai4cc_queues`
- `public.ai4cc_audit_logs`

Customer 360 must not create separate call, SMS, chat, customer, lead, activity, or task stores.

## CR-01C Package 01 — Unified Customer View
Package 01 is read-only aggregation and navigation over canonical records.

### Operator capabilities
1. Tenant-scoped Contact directory.
2. Contact search across name, company, email, phone, tags, source, priority and preferred channel.
3. Customer profile card with identity, source, score, priority, preferred channel and consent/contactability state.
4. Cross-channel interaction history sourced from canonical `ai4cc_interactions`.
5. Lead portfolio sourced from canonical `ai4cc_leads`.
6. Lead Activity timeline sourced from canonical `ai4cc_lead_activities`.
7. Task portfolio sourced from canonical `ai4cc_lead_tasks`.
8. Commercial summary: open leads, pipeline value, weighted value, open tasks and most recent interaction.
9. Channel summary for Voice, SMS and Web Chat.
10. Contextual navigation to the canonical Lead Management and Activity + Task Operations surfaces.
11. Manual refresh only.

## Contact-to-interaction correlation
Package 01 uses only evidence already present in canonical records:

- interactions referenced by Leads through `originating_interaction_id`
- exact contact email match to `ai4cc_interactions.customer_identifier`
- exact normalized contact phone match to `ai4cc_interactions.customer_identifier`

No probabilistic identity merge is performed.

## Security
- API tenant is derived exclusively through `requireAi4ccContext()`.
- Browser callers cannot provide or override tenant ID.
- Reads use the server-side canonical Supabase authority.
- Package 01 adds no database mutation function and no direct browser write authority.

## Manual-refresh requirement
Customer 360 must not introduce:

- heartbeat
- polling interval
- realtime subscription
- background refresh
- alternate monitoring connector

All operator refresh is explicit and on demand.

## Frozen / out of scope for Package 01
- contact mutation
- consent mutation
- contact merge/deduplication workflow
- fuzzy identity resolution
- campaign sequencing
- outbound automation
- subscriptions/entitlements/billing
- new Voice/SMS/Web Chat runtime behavior
- new Lead lifecycle authority
- new Activity/Task authority

## Follow-on CR-01C packages
### Package 02 — Controlled Contact Profile + Consent Lifecycle
Controlled edits to canonical Contact identity/profile/consent state with RBAC and Audit evidence.

### Package 03 — Identity Resolution + Duplicate Review
Evidence-based duplicate candidate detection and deliberate operator merge/reject workflow. No automatic destructive merge.

## Package 01 acceptance
- `/customer-360` renders tenant-scoped canonical Contacts.
- selecting a Contact preserves `contactId` in the URL.
- search is client-side over already-loaded tenant Contacts.
- profile, interactions, Leads, Activities and Tasks all correspond to the selected canonical Contact.
- Lead links open `/lead-management?leadId=<canonical UUID>`.
- Task/Activity links open `/lead-operations?leadId=<canonical UUID>`.
- mobile/tablet navigation baseline remains intact.
- no automatic refresh is introduced.
- Deploy Preview builds successfully with zero secret-scan matches.
