# Telephone staging ticket persistence — October 17, 2026

Scope: Railway staging only. Approved voice/persona, model pair, greeting and ticket conversation flow preserved. Original protected browser deployment unchanged. Production untouched.

## Implementation
The existing authenticated Twilio bridge dispatches completed Support tool calls to a server-only staging adapter. It pins the Supabase URL to https://hvzauakkhlivzeqatfqm.supabase.co and tenant 5885a020-d363-4c27-910a-c035eda132f5, validates all nine arguments, and derives idempotency identity from the actual Twilio CallSid. Model-supplied tenant, call/session identifiers and unexpected properties are rejected. HTTP/network/unconfirmed results never announce success or auto-retry an uncertain write.

New RPC public.stellar_create_phone_support_test_intake is SECURITY INVOKER, executable only by service_role, and checks that role plus the exact authorized tenant. It serializes fictional test writes per tenant and atomically creates/links the test customer and case. Browser RPC, existing RLS and anonymous/app-user grants are unchanged. Added INSERT on the staging support-case table to service_role because it previously had only read access. No new SECURITY DEFINER or RLS bypass setting was introduced.
The case source remains private_voice_test to satisfy the existing constraint; phone-staging CallSid prefix and customer metadata distinguish this path. All cases have test_only=true. Notifications and technician follow-up remain false; no Resend or production endpoint is called.
SQL source: supabase/staging/support_phone_test_intake.sql. Applied ONLY to staging; do not include in a production migration run.

## Verified evidence
106 local automated tests passed, TypeScript compilation, server/module syntax and whitespace checks passed.
Database role-level tests created case 3700c837-1c8f-4452-a2e8-44b2df934596 linked to customer 9630ae52-48b0-42b5-ae06-6e68a73f5d74. Exactly one case for phone-staging:CA00000000000000000000000000000091, same approved tenant, test_only=true, notifications_disabled=true.
Duplicate invocation returned the same identifier. Cross-tenant invocation rejected. A subtransaction that intentionally failed after creating its test records left neither customer nor case behind. Anon and authenticated roles have no execute permission on the machine RPC. Security advisor returned no notice naming the new function.
These are database/adapter tests, NOT a live voice-to-database acceptance pass.

## Credential blocker and owner step
Railway lacks STAGING_SUPABASE_SERVICE_ROLE_KEY. The private Netlify site has a configured staging credential but its secret value is redacted; it cannot be copied through the connector.
Owner must set STAGING_SUPABASE_SERVICE_ROLE_KEY privately on stellaruc-voice-bridge-staging in the staging environment, using the service_role key for hvzauakkhlivzeqatfqm ONLY. Do not enter a production key or send any credential in chat.
Prepared non-secret variables: STAGING_SUPPORT_WRITES_ENABLED=true; STAGING_SUPABASE_URL=https://hvzauakkhlivzeqatfqm.supabase.co. Existing CSS_TENANT_ID is validated against the allowed tenant.
Until the key is present, health.supportPersistence reports STAGING_DATABASE_CREDENTIAL_MISSING and writes fail closed. Presence alone does not prove key validity; the next authenticated save must confirm it.
After setting the key, wait for a successful staging deployment, verify health, then run one fictional support call, approve the audible closing flow, and independently verify the exact spoken ID and one linked database case. No technician callback or real notifications are authorized by this test.

## Recovery
Set STAGING_SUPPORT_WRITES_ENABLED=false in staging to disable adapter writes without changing voice settings; redeploy that environment. Previous staging revision 62e201c002d63bab1018ac696379e690985c8fd1 can be repinned there. Leave test data as evidence. Do not change production routing.
