# AI4CC CR-01B Package 02 — Controlled Validation Gates

Package 02 is not production-accepted until the following gates pass.

1. Build / Deploy Preview
   - Next.js production build succeeds.
   - `/lead-operations` renders through the authenticated application shell.
   - shared navigation and prior Lead Management presentation remain unchanged.

2. Database / Security
   - Package 02 migration applies cleanly on an isolated validation branch before production.
   - RPC execution is limited to `service_role`.
   - authenticated/anon direct Task writes are closed.
   - existing tenant-scoped SELECT policies remain.

3. Activity transaction
   - record one controlled Lead Activity.
   - verify exact Lead/contact linkage.
   - verify Activity row and `lead.activity_recorded` Audit row.

4. Task transaction
   - create one controlled Lead Task.
   - verify canonical Agent assignment and due/priority fields.
   - transition `pending -> in_progress -> completed`.
   - verify `completed_at`, `completed_by`, semantic Lead Activities, and Audit actions.

5. Regression boundary
   - CR-01A creation and Package 01 lifecycle state remain unchanged.
   - Voice/SMS/Web Chat runtime remains untouched.
   - no heartbeat or background polling is introduced.

Production migration, merge, and production acceptance follow only after these gates are satisfied.