# AI4CC Commercialization Readiness — CR-01

## Tenant Provisioning & Customer Administration Foundation

Status: IN PROGRESS

## Objective

Move AI4 Intelligent Contact Center from validated production product to commercially operable SaaS/customer deployment without creating a second tenant, routing, interaction, queue, agent, or identity authority.

## Verified Existing Foundation

- Canonical tenant table: `ai4cc_tenants`
- Canonical membership table: `ai4cc_tenant_members`
- Authenticated API context resolves `user_id`, `tenant_id`, and `role` through canonical membership.
- Tenant/member RLS is already role-aware.
- Tenant members may read their tenant membership.
- Owner/admin roles may administer tenant members.
- Owner/admin roles may update tenant records.
- Voice, SMS, and Web Chat are already production exercised through the shared canonical runtime.

## Commercialization Gaps Identified

The AI4CC repositories currently contain no dedicated implementation for:

- commercial plans
- subscriptions
- entitlements
- licensing
- customer onboarding workflow
- tenant provisioning workflow
- commercial account lifecycle
- trial lifecycle
- billing-provider integration
- customer-facing administrator setup

No unrelated product namespace will be reused to fill these gaps.

## CR-01 Scope

1. Preserve `ai4cc_tenants` as customer/account authority.
2. Preserve `ai4cc_tenant_members` as membership/RBAC authority.
3. Define tenant lifecycle states suitable for commercial operation.
4. Define controlled provisioning workflow for a new customer tenant and first owner.
5. Define customer-administrator management boundary.
6. Add onboarding/provisioning status separately from runtime interaction data.
7. Add immutable audit events for provisioning and administration.
8. Keep pricing and payment-provider decisions out of CR-01.

## Required Governance

- No automatic public self-provisioning until entitlement and abuse controls exist.
- No service-role credentials exposed to browser clients.
- Provisioning must be owner/admin controlled.
- Tenant creation and first-owner membership must be atomic or safely recoverable.
- All customer-scoped configuration must retain explicit tenant IDs.
- No reuse of `bc_*` subscription tables or another product's billing authority.
- No production schema mutation until migration is reviewed through the controlled branch/PR process.

## CR-01 Acceptance Gates

- Tenant lifecycle model documented and implemented.
- Provisioning operation is authenticated and role-restricted.
- First-owner membership is established safely.
- Duplicate slug/customer provisioning is rejected deterministically.
- Audit evidence exists for provisioning and membership administration.
- Existing AI4CC tenant and production runtime remain unchanged.
- Deploy Preview passes before merge.
- Production deploy is verified against exact merge commit.

## Follow-On Commercialization Passes

- CR-02 — Plans, Entitlements & Commercial Access Control
- CR-03 — Customer Onboarding & Administrator Experience
- CR-04 — Demo/Trial Environment & Sales Enablement
- CR-05 — Operational Documentation, Support & SLA Package
- CR-06 — Buyer Due Diligence, IP Inventory & Data Room
- CR-07 — Pricing, Licensing & Payment Integration
- CR-08 — Commercial Launch Acceptance
