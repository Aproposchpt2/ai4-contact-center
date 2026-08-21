# AI4CC Pass 03 — Deployed Flow Authority

## Purpose

Replace implicit latest-version runtime selection with controlled deployment authority while preserving validated channel behavior.

## Resolution order

1. Tenant
2. Channel
3. Runtime environment
4. Latest matching `ai4cc_deployments` row with `status = deployed`
5. Exact `flow_version_id`

## Migration safeguard

Because the canonical deployment table is currently empty, non-production environments may temporarily fall back to the latest matching channel flow version. Production never falls back.

## Runtime environment

`AI4CC_RUNTIME_ENVIRONMENT` supports `dev`, `qa`, `staging`, and `production`; absent/invalid values resolve to `dev`.

## Channel isolation

Voice, SMS, and Chat can only resolve a deployment whose flow belongs to the same tenant and same channel.

## Observability

New interactions and audit records expose runtime environment, authority mode, deployment ID, and exact flow version where applicable.

## Production cutover prerequisite

Before setting `AI4CC_RUNTIME_ENVIRONMENT=production`, create validated production deployments for every channel intended to accept live interactions.
