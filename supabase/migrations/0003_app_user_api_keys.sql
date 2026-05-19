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
