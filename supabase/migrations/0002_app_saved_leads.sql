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
