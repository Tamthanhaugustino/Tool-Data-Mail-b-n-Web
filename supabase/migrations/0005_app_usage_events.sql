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
