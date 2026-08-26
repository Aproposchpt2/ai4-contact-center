-- AI4CC CR-01A — Native Lead Management + Customer Intelligence
-- Canonical contact/lead lifecycle only. Voice/SMS/Chat runtime remains authoritative in existing ai4cc_* interaction tables.

create table if not exists public.ai4cc_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.ai4cc_tenants(id) on delete cascade,
  first_name text,
  last_name text,
  display_name text,
  company_name text,
  email text,
  phone text,
  preferred_channel text,
  lead_source text,
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  sms_consent boolean not null default false,
  email_consent boolean not null default false,
  do_not_contact boolean not null default false,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai4cc_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.ai4cc_tenants(id) on delete cascade,
  contact_id uuid not null references public.ai4cc_contacts(id) on delete cascade,
  originating_interaction_id uuid references public.ai4cc_interactions(id) on delete set null,
  originating_channel text,
  originating_queue_id uuid references public.ai4cc_queues(id) on delete set null,
  originating_agent_id uuid references public.ai4cc_agents(id) on delete set null,
  title text not null,
  service_interest text,
  description text,
  pipeline_stage text not null default 'new' check (pipeline_stage in ('new','qualified','contacted','follow_up','opportunity','converted','lost','nurture')),
  status text not null default 'open' check (status in ('open','won','lost','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  score integer not null default 0 check (score between 0 and 100),
  estimated_value numeric(14,2) not null default 0,
  probability integer not null default 0 check (probability between 0 and 100),
  expected_close_date date,
  assigned_agent_id uuid references public.ai4cc_agents(id) on delete set null,
  next_action text,
  next_follow_up timestamptz,
  last_contacted_at timestamptz,
  converted_at timestamptz,
  lost_reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai4cc_lead_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.ai4cc_tenants(id) on delete cascade,
  lead_id uuid not null references public.ai4cc_leads(id) on delete cascade,
  contact_id uuid references public.ai4cc_contacts(id) on delete set null,
  interaction_id uuid references public.ai4cc_interactions(id) on delete set null,
  activity_type text not null,
  direction text,
  subject text,
  body text,
  outcome text,
  actor_user_id uuid,
  actor_agent_id uuid references public.ai4cc_agents(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.ai4cc_lead_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.ai4cc_tenants(id) on delete cascade,
  lead_id uuid not null references public.ai4cc_leads(id) on delete cascade,
  contact_id uuid references public.ai4cc_contacts(id) on delete set null,
  assigned_agent_id uuid references public.ai4cc_agents(id) on delete set null,
  title text not null,
  description text,
  task_type text not null default 'follow_up',
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  completed_at timestamptz,
  completed_by uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai4cc_contacts_tenant_idx on public.ai4cc_contacts(tenant_id, updated_at desc);
create index if not exists ai4cc_contacts_email_idx on public.ai4cc_contacts(tenant_id, lower(email)) where email is not null;
create index if not exists ai4cc_contacts_phone_idx on public.ai4cc_contacts(tenant_id, phone) where phone is not null;
create index if not exists ai4cc_leads_tenant_stage_idx on public.ai4cc_leads(tenant_id, pipeline_stage, updated_at desc);
create index if not exists ai4cc_leads_origin_idx on public.ai4cc_leads(tenant_id, originating_interaction_id) where originating_interaction_id is not null;
create index if not exists ai4cc_lead_tasks_due_idx on public.ai4cc_lead_tasks(tenant_id, status, due_at);
create index if not exists ai4cc_lead_activities_lead_idx on public.ai4cc_lead_activities(tenant_id, lead_id, created_at desc);

alter table public.ai4cc_contacts enable row level security;
alter table public.ai4cc_leads enable row level security;
alter table public.ai4cc_lead_activities enable row level security;
alter table public.ai4cc_lead_tasks enable row level security;

create policy ai4cc_contacts_select_member on public.ai4cc_contacts for select using (ai4cc_private.is_tenant_member(tenant_id));
create policy ai4cc_contacts_manage_member on public.ai4cc_contacts for all using (ai4cc_private.is_tenant_member(tenant_id)) with check (ai4cc_private.is_tenant_member(tenant_id));
create policy ai4cc_leads_select_member on public.ai4cc_leads for select using (ai4cc_private.is_tenant_member(tenant_id));
create policy ai4cc_leads_manage_member on public.ai4cc_leads for all using (ai4cc_private.is_tenant_member(tenant_id)) with check (ai4cc_private.is_tenant_member(tenant_id));
create policy ai4cc_lead_activities_select_member on public.ai4cc_lead_activities for select using (ai4cc_private.is_tenant_member(tenant_id));
create policy ai4cc_lead_activities_insert_member on public.ai4cc_lead_activities for insert with check (ai4cc_private.is_tenant_member(tenant_id));
create policy ai4cc_lead_tasks_select_member on public.ai4cc_lead_tasks for select using (ai4cc_private.is_tenant_member(tenant_id));
create policy ai4cc_lead_tasks_manage_member on public.ai4cc_lead_tasks for all using (ai4cc_private.is_tenant_member(tenant_id)) with check (ai4cc_private.is_tenant_member(tenant_id));
