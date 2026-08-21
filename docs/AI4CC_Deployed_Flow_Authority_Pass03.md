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

Because the canonical deployment table is currently empty, non-production environments use staged fallback:

1. latest matching channel flow version;
2. if none exists, the legacy latest tenant flow version used by the validated development runtime.

The legacy fallback is explicitly marked `development_legacy_fallback` for observability and must be eliminated after SMS and Chat receive channel-specific canonical configurations.

Production never falls back.

## Runtime environment

`AI4CC_RUNTIME_ENVIRONMENT` supports `dev`, `qa`, `staging`, and `production`; absent/invalid values resolve to `dev`.

## Channel isolation

Deployed authority is strictly tenant- and channel-matched. The temporary legacy fallback is permitted only outside production to preserve the already validated channel runtime until channel-specific deployments exist.

## Observability

New interactions and audit records expose runtime environment, authority mode, deployment ID, and exact flow version where applicable.

## Production cutover prerequisite

Before setting `AI4CC_RUNTIME_ENVIRONMENT=production`, create validated production deployments for every channel intended to accept live interactions. Production has no latest-version or legacy fallback.
