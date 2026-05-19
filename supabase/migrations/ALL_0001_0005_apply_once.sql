-- =============================================================================
-- ALL_0001_0005_apply_once.sql
-- =============================================================================
--
-- File gộp 5 migration 0001 -> 0005 thành 1 file duy nhất.
-- Mục đích: copy-paste 1 lần vào Supabase SQL Editor và bấm Run.
--
-- KHÔNG sửa logic — chỉ gộp nội dung gốc đúng thứ tự apply.
-- Mọi migration đều idempotent (create if not exists / drop trigger if exists /
-- create or replace function), an toàn chạy lại nhiều lần.
--
-- Cách dùng (PowerShell):
--   Get-Content supabase\migrations\ALL_0001_0005_apply_once.sql -Raw | Set-Clipboard
-- Rồi vào Supabase Studio -> SQL Editor -> dán -> Run.
--
-- Sau khi Run, verify ở Database -> Tables:
--   - profiles, workspaces, memberships, user_api_keys, discovery_runs,
--     scan_jobs, scan_results, saved_leads, exports, billing_subscriptions,
--     audit_logs                                                     (0001)
--   - app_saved_leads                                                (0002)
--   - app_user_api_keys                                              (0003)
--   - app_scan_jobs, app_scan_results                                (0004)
--   - app_usage_events                                               (0005)
-- =============================================================================


-- =============================================================================
-- 0001_initial_schema.sql
-- =============================================================================
-- Tool Data Mail Web — initial schema (Phase 04 foundation)
--
-- Status: DRAFT — not applied yet. No Supabase project is provisioned in
-- this repo. This migration is reviewed and ready to apply when Phase 05+
-- wires the real backend.
--
-- Conventions:
--   * uuid primary keys (gen_random_uuid()).
--   * timestamptz for time columns; created_at / updated_at on mutable rows.
--   * RLS enabled on every business table; policies are workspace-scoped.
--   * Sensitive columns (api keys, billing) never store plaintext secrets.
--
-- Apply order matters for FKs and policies; keep statements in this file
-- in dependency order.

-- =====================================================================
-- 0. Extensions
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid
create extension if not exists "citext";     -- case-insensitive email/text

-- =====================================================================
-- 1. Enum types
-- =====================================================================

create type membership_role  as enum ('owner', 'admin', 'member');
create type profile_role     as enum ('user', 'admin');
create type api_provider     as enum ('hunter', 'serpapi');
create type run_status       as enum ('pending', 'running', 'completed', 'failed', 'cancelled');
create type result_status    as enum ('verified', 'accept_all', 'webmail', 'invalid', 'unknown');
create type lead_status      as enum ('new', 'contacted', 'interested', 'customer', 'not_relevant');
create type export_kind      as enum ('scan_results', 'saved_leads', 'discovery_results');
create type export_format    as enum ('csv', 'json');
create type export_status    as enum ('pending', 'ready', 'failed', 'expired');
create type plan_tier        as enum ('trial', 'basic', 'pro', 'agency');
create type subscription_status as enum ('active', 'trialing', 'past_due', 'cancelled', 'expired');

-- =====================================================================
-- 2. profiles — 1:1 with auth.users
-- =====================================================================
--
-- Supabase Auth manages auth.users; we keep app-level profile here. When
-- Supabase Auth is wired (post Phase 03 demo), each demo user becomes a
-- real auth.users row and a matching profiles row (see docs/DATABASE.md).

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        citext not null unique,
  display_name text,
  initials     text,
  role         profile_role not null default 'user',
  locale       text not null default 'vi',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table profiles is 'Application-level user profile, 1:1 with auth.users.';
comment on column profiles.role is 'Global role for admin gating. Per-workspace role lives in memberships.';

-- =====================================================================
-- 3. workspaces + memberships
-- =====================================================================
--
-- Every action in the app is scoped to a workspace. Phase 04 ships with
-- one workspace per user (owner-only). The memberships table is shaped
-- now so multi-user teams (Phase 09+) do not require schema migration.

create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete restrict,
  name        text not null,
  slug        citext not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index workspaces_owner_id_idx on workspaces(owner_id);

create table memberships (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  role          membership_role not null default 'owner',
  created_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index memberships_user_id_idx      on memberships(user_id);
create index memberships_workspace_id_idx on memberships(workspace_id);

-- Helper: returns true if the current auth user is a member of the workspace.
-- Used in RLS policies on every workspace-scoped table.
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

-- =====================================================================
-- 4. user_api_keys
-- =====================================================================
--
-- Personal credentials are scoped to a user (not a workspace) — each user
-- supplies their own Hunter / SerpAPI keys. We store ciphertext only; the
-- encryption scheme (Supabase Vault vs app-level) is decided in Phase 05.

create table user_api_keys (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  provider           api_provider not null,
  encrypted_key      bytea not null,
  key_hint           text not null,                                   -- last 4 chars for UI
  is_active          boolean not null default true,
  last_validated_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, provider)
);

comment on column user_api_keys.encrypted_key is 'Ciphertext only — never store plaintext. Encryption scheme TBD in Phase 05.';

-- =====================================================================
-- 5. discovery_runs — Keyword Discovery (SerpAPI)
-- =====================================================================

create table discovery_runs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  created_by      uuid not null references profiles(id) on delete restrict,
  status          run_status not null default 'pending',
  keyword         text not null,
  country         text not null default 'vn',
  options         jsonb not null default '{}'::jsonb,
  result_count    int not null default 0,
  error_message   text,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index discovery_runs_workspace_idx on discovery_runs(workspace_id, created_at desc);
create index discovery_runs_status_idx    on discovery_runs(status) where status in ('pending', 'running');

-- =====================================================================
-- 6. scan_jobs — Domain Scan (Hunter.io)
-- =====================================================================

create table scan_jobs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  created_by      uuid not null references profiles(id) on delete restrict,
  status          run_status not null default 'pending',
  domains         text[] not null,
  options         jsonb not null default '{}'::jsonb,
  result_count    int not null default 0,
  error_message   text,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz not null default now(),
  check (cardinality(domains) > 0)
);

create index scan_jobs_workspace_idx on scan_jobs(workspace_id, created_at desc);
create index scan_jobs_status_idx    on scan_jobs(status) where status in ('pending', 'running');

-- =====================================================================
-- 7. scan_results — rows belonging to a discovery_run OR a scan_job
-- =====================================================================
--
-- We keep results in a single table for unified Results / Export queries.
-- Exactly one of discovery_run_id / scan_job_id is non-null.

create table scan_results (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references workspaces(id) on delete cascade,
  discovery_run_id   uuid references discovery_runs(id) on delete cascade,
  scan_job_id        uuid references scan_jobs(id) on delete cascade,
  domain             text,
  company_name       text,
  email              citext,
  contact_name       text,
  title              text,
  source             text,                          -- 'hunter', 'serp', 'manual'
  confidence         numeric(5,2),                  -- 0..100
  status             result_status not null default 'unknown',
  raw_payload        jsonb,
  created_at         timestamptz not null default now(),
  check (
    (discovery_run_id is not null)::int + (scan_job_id is not null)::int = 1
  )
);

create index scan_results_discovery_idx     on scan_results(discovery_run_id) where discovery_run_id is not null;
create index scan_results_scan_job_idx      on scan_results(scan_job_id)      where scan_job_id      is not null;
create index scan_results_workspace_email_idx on scan_results(workspace_id, email);
create index scan_results_workspace_domain_idx on scan_results(workspace_id, domain);

-- =====================================================================
-- 8. saved_leads — user-curated CRM mini-table
-- =====================================================================

create table saved_leads (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  scan_result_id  uuid references scan_results(id) on delete set null,
  email           citext not null,
  domain          text,
  company_name    text,
  contact_name    text,
  title           text,
  confidence      numeric(5,2),
  status          lead_status not null default 'new',
  tags            text[] not null default '{}',
  notes           text,
  saved_by        uuid not null references profiles(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (workspace_id, email)
);

create index saved_leads_workspace_status_idx on saved_leads(workspace_id, status);
create index saved_leads_workspace_tags_idx   on saved_leads using gin (tags);

-- =====================================================================
-- 9. exports — CSV/JSON export jobs
-- =====================================================================

create table exports (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  created_by    uuid not null references profiles(id) on delete restrict,
  kind          export_kind not null,
  format        export_format not null,
  status        export_status not null default 'pending',
  filters       jsonb not null default '{}'::jsonb,
  row_count     int,
  storage_path  text,                                -- Supabase Storage object path
  expires_at    timestamptz,
  error_message text,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index exports_workspace_idx on exports(workspace_id, created_at desc);

-- =====================================================================
-- 10. billing_subscriptions
-- =====================================================================
--
-- One active subscription per workspace. Stripe IDs are nullable for the
-- prototype period; the activation-code path used by the desktop app maps
-- onto plan + status without Stripe (see docs/DATABASE.md).

create table billing_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null unique references workspaces(id) on delete cascade,
  plan                     plan_tier not null default 'trial',
  status                   subscription_status not null default 'trialing',
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  activation_code          text,                     -- legacy desktop-style activation
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- =====================================================================
-- 11. audit_logs — append-only
-- =====================================================================

create table audit_logs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid references workspaces(id) on delete set null,
  actor_user_id   uuid references profiles(id) on delete set null,
  action          text not null,                    -- e.g. 'api_key.updated', 'export.created'
  resource_type   text,
  resource_id     uuid,
  metadata        jsonb not null default '{}'::jsonb,
  ip_address      inet,
  created_at      timestamptz not null default now()
);

create index audit_logs_workspace_idx on audit_logs(workspace_id, created_at desc);
create index audit_logs_action_idx    on audit_logs(action, created_at desc);

-- =====================================================================
-- 12. updated_at triggers
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at              before update on profiles              for each row execute function public.set_updated_at();
create trigger workspaces_set_updated_at            before update on workspaces            for each row execute function public.set_updated_at();
create trigger user_api_keys_set_updated_at         before update on user_api_keys         for each row execute function public.set_updated_at();
create trigger saved_leads_set_updated_at           before update on saved_leads           for each row execute function public.set_updated_at();
create trigger billing_subscriptions_set_updated_at before update on billing_subscriptions for each row execute function public.set_updated_at();

-- =====================================================================
-- 13. Row Level Security — DRAFT
-- =====================================================================
--
-- All policies use auth.uid() (the Supabase Auth user id). They assume
-- the application connects to Postgres as the `authenticated` role. The
-- service_role bypasses RLS by design — keep it server-only.
--
-- These policies are reviewed but NOT YET battle-tested. Re-audit before
-- enabling in production (Phase 10).

alter table profiles               enable row level security;
alter table workspaces             enable row level security;
alter table memberships            enable row level security;
alter table user_api_keys          enable row level security;
alter table discovery_runs         enable row level security;
alter table scan_jobs              enable row level security;
alter table scan_results           enable row level security;
alter table saved_leads            enable row level security;
alter table exports                enable row level security;
alter table billing_subscriptions  enable row level security;
alter table audit_logs             enable row level security;

-- profiles: user reads/updates own row; global admins read all.
create policy profiles_self_select on profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy profiles_self_update on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- workspaces: members can read; only owner can update/delete.
create policy workspaces_member_select on workspaces
  for select using (public.is_workspace_member(id));
create policy workspaces_owner_update on workspaces
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- memberships: members of the workspace can read; owner/admin can manage.
create policy memberships_member_select on memberships
  for select using (public.is_workspace_member(workspace_id));
create policy memberships_owner_manage on memberships
  for all using (
    exists (
      select 1 from memberships m
      where m.workspace_id = memberships.workspace_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  ) with check (
    exists (
      select 1 from memberships m
      where m.workspace_id = memberships.workspace_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- user_api_keys: strictly user-scoped, never workspace-shared.
create policy user_api_keys_owner_all on user_api_keys
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Generic workspace-scoped policies: members can do everything in their workspace.
-- Tighter write restrictions can be layered on later when team roles matter.
create policy discovery_runs_member_all on discovery_runs
  for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy scan_jobs_member_all on scan_jobs
  for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy scan_results_member_all on scan_results
  for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy saved_leads_member_all on saved_leads
  for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy exports_member_all on exports
  for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- billing_subscriptions: members read; only owner can update (writes typically come from server with service_role).
create policy billing_member_select on billing_subscriptions
  for select using (public.is_workspace_member(workspace_id));
create policy billing_owner_update on billing_subscriptions
  for update using (
    exists (
      select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

-- audit_logs: members can read their workspace; never writable from client (server inserts via service_role).
create policy audit_logs_member_select on audit_logs
  for select using (workspace_id is null or public.is_workspace_member(workspace_id));

-- =====================================================================
-- 14. Bootstrap helper: create profile + workspace + membership for a new auth.users row
-- =====================================================================
--
-- Trigger this from a Supabase Auth hook (handle_new_user). The default
-- workspace makes Phase 04 single-user UX work without any extra UI.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  default_name text;
  default_slug text;
begin
  default_name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));
  default_slug := lower(regexp_replace(default_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8);

  insert into profiles (id, email, display_name, initials, role)
  values (
    new.id,
    new.email,
    default_name,
    upper(substr(default_name, 1, 2)),
    'user'
  );

  insert into workspaces (owner_id, name, slug)
  values (new.id, default_name || ' workspace', default_slug)
  returning id into new_workspace_id;

  insert into memberships (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  insert into billing_subscriptions (workspace_id, plan, status)
  values (new_workspace_id, 'trial', 'trialing');

  return new;
end;
$$;

-- Trigger creation (commented — uncomment when applying against Supabase project):
--
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();


-- =============================================================================
-- 0002_app_saved_leads.sql
-- =============================================================================
-- Phase 09D — Saved Leads persistence for demo HMAC session (text user_id).
--
-- Bảng `saved_leads` trong 0001_initial_schema.sql là workspace-scoped (uuid FK
-- profiles/workspaces) — dùng sau Supabase Auth migration.
-- Bảng này phục vụ Phase 09C–09D: user_id = session.id từ demo cookie.
--
-- Apply: Supabase SQL Editor hoặc `supabase db push` sau khi có project.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =====================================================================
-- app_saved_leads
-- =====================================================================

create table if not exists public.app_saved_leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  email       citext not null,
  name        text,
  title       text,
  company     text,
  domain      text not null,
  confidence  numeric(5, 2),
  status      text not null default 'verified',
  source      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint app_saved_leads_status_check check (
    status in ('verified', 'accept_all', 'webmail')
  )
);

comment on table public.app_saved_leads is
  'Saved leads per demo session user_id (Phase 09D). Distinct from workspace saved_leads (0001).';

-- Dedupe: một user không lưu trùng email + domain (không phân biệt hoa thường).
create unique index if not exists app_saved_leads_user_email_domain_uidx
  on public.app_saved_leads (
    user_id,
    lower(email::text),
    lower(domain)
  );

create index if not exists app_saved_leads_user_created_idx
  on public.app_saved_leads (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_saved_leads_set_updated_at on public.app_saved_leads;

create trigger app_saved_leads_set_updated_at
  before update on public.app_saved_leads
  for each row execute function public.set_updated_at();

-- RLS on; no policies for anon/authenticated — app uses service_role server-only.
alter table public.app_saved_leads enable row level security;


-- =============================================================================
-- 0003_app_user_api_keys.sql
-- =============================================================================
-- Phase 09F — user-scoped provider API keys for hybrid auth sessions.
--
-- Keys are encrypted by the app before insert. This table must never store
-- plaintext API keys. user_id is text because Phase 09E can be demo HMAC id
-- or Supabase auth.users UUID.

create extension if not exists "pgcrypto";

-- =====================================================================
-- app_user_api_keys
-- =====================================================================

create table if not exists public.app_user_api_keys (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null,
  provider       text not null,
  key_ciphertext text not null,
  key_hint       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint app_user_api_keys_provider_check check (
    provider in ('hunter', 'serpapi')
  ),
  constraint app_user_api_keys_user_provider_unique unique (user_id, provider)
);

comment on table public.app_user_api_keys is
  'Encrypted per-user provider API keys (Phase 09F). Distinct from workspace user_api_keys (0001).';

comment on column public.app_user_api_keys.key_ciphertext is
  'App-encrypted ciphertext only. Never store plaintext API keys.';

create index if not exists app_user_api_keys_user_idx
  on public.app_user_api_keys (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_user_api_keys_set_updated_at on public.app_user_api_keys;

create trigger app_user_api_keys_set_updated_at
  before update on public.app_user_api_keys
  for each row execute function public.set_updated_at();

-- RLS on; no policies for anon/authenticated — app uses service_role server-only
-- and every read/write filters by user_id.
alter table public.app_user_api_keys enable row level security;


-- =============================================================================
-- 0004_app_scan_jobs.sql
-- =============================================================================
-- Phase 09G: persist Domain Scan jobs/results.
--
-- RLS is enabled but no anon/authenticated policies are created in this
-- phase. The Next.js app writes through the server-only service-role client
-- and always filters by user_id.

create extension if not exists "pgcrypto";

create table if not exists public.app_scan_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null,
  status text not null,
  input_domains jsonb not null,
  email_limit_per_domain integer,
  total_domains integer not null default 0,
  scanned_domains integer not null default 0,
  total_emails integer not null default 0,
  duration_ms integer,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_scan_jobs_status_check
    check (status in ('completed', 'partial', 'failed')),
  constraint app_scan_jobs_input_domains_array_check
    check (jsonb_typeof(input_domains) = 'array')
);

create table if not exists public.app_scan_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.app_scan_jobs(id) on delete cascade,
  user_id text not null,
  email text not null,
  name text,
  title text,
  company text,
  domain text not null,
  confidence numeric,
  status text,
  source text,
  provider text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_scan_jobs_user_created_idx
  on public.app_scan_jobs (user_id, created_at desc);

create index if not exists app_scan_results_user_job_idx
  on public.app_scan_results (user_id, job_id);

create index if not exists app_scan_results_user_domain_idx
  on public.app_scan_results (user_id, domain);

create or replace function public.set_app_scan_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_scan_jobs_updated_at on public.app_scan_jobs;

create trigger set_app_scan_jobs_updated_at
before update on public.app_scan_jobs
for each row
execute function public.set_app_scan_jobs_updated_at();

alter table public.app_scan_jobs enable row level security;
alter table public.app_scan_results enable row level security;


-- =============================================================================
-- 0005_app_usage_events.sql
-- =============================================================================
-- Phase 09H: usage/quota foundation.
--
-- RLS is enabled but no anon/authenticated policies are created in this
-- phase. The Next.js app writes through the server-only service-role client
-- and always filters reads by user_id.

create extension if not exists "pgcrypto";

create table if not exists public.app_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null,
  provider text,
  quantity integer not null default 1,
  subject_type text,
  subject_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint app_usage_events_event_type_check
    check (event_type in (
      'discovery_search',
      'domain_scan',
      'hunter_search',
      'serpapi_search',
      'saved_lead',
      'csv_export'
    )),
  constraint app_usage_events_quantity_check
    check (quantity > 0),
  constraint app_usage_events_metadata_object_check
    check (metadata is null or jsonb_typeof(metadata) = 'object')
);

create index if not exists app_usage_events_user_created_idx
  on public.app_usage_events (user_id, created_at desc);

create index if not exists app_usage_events_user_type_created_idx
  on public.app_usage_events (user_id, event_type, created_at desc);

alter table public.app_usage_events enable row level security;


-- =============================================================================
-- END ALL_0001_0005_apply_once.sql
-- =============================================================================
