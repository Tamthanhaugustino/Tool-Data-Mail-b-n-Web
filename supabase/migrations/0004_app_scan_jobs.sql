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
