# AI4CC CR-01B Package 02 — Activity + Task Operations

Status: IMPLEMENTED ON CONTROLLED BRANCH / VALIDATION PENDING

## Objective

Operationalize the existing canonical Lead domain with explicit business Activities and tenant-scoped follow-up Tasks without introducing a parallel CRM, task store, routing system, or background polling process.

## Canonical authorities

- `ai4cc_leads`
- `ai4cc_contacts`
- `ai4cc_lead_activities`
- `ai4cc_lead_tasks`
- `ai4cc_agents`
- `ai4cc_tenant_members`
- `ai4cc_audit_logs`

## Package 02 capabilities

- Manual-refresh Lead Operations workspace at `/lead-operations`.
- Record free-form Lead business Activities with type, direction, subject, notes, and outcome.
- Create Lead Tasks with title, description, task type, due date, priority, and canonical Agent assignment.
- Update task status, due date, and Agent assignment.
- Task lifecycle states: `pending`, `in_progress`, `completed`, `cancelled`.
- Completion timestamps and actor evidence are database-controlled.
- Every Activity mutation writes canonical Audit evidence.
- Every Task mutation writes semantic Lead Activity plus canonical Audit evidence.

## RBAC

- Owner/Admin/Supervisor: full Package 02 operational authority.
- Operator: activity and task operations; may assign tasks within the tenant.
- Agent: only Leads assigned to that canonical Agent; task assignment remains self-only.

## Security boundary

- Tenant comes from `requireAi4ccContext()`; browser callers do not select tenant.
- RPCs independently derive membership role and validate tenant ownership.
- Package 02 RPC execution is service-role only.
- Direct authenticated Data API writes to `ai4cc_lead_tasks` are removed.
- Existing tenant-scoped SELECT policies remain.

## Operating model

Manual refresh only. Package 02 adds no heartbeat, polling loop, duplicate sync process, or alternate operational authority.

## Explicitly not included

- Package 03 timeline/pagination/operator-experience completion.
- CR-01C Customer 360 / Contact Intelligence.
- campaigns or outbound sequencing.
- automatic task generation.
- external CRM synchronization.
