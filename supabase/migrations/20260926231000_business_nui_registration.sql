-- Business NUI registration and business document support.
--
-- Adds:
--   1. business_profiles: one row per business account, holding the ARBK NUI.
--   2. Uniqueness + lookup indexes for the NUI (identity-level guarantee).
--   3. handle_new_user extension: persists account_type/business_nui from
--      signup metadata atomically with auth.users creation, so a Business
--      signup can never leave a partially configured business profile.
--   4. RLS: a business reads/updates only its own row; the NUI column is
--      user-immutable (updates must not change it), matching the verified
--      business-identity model.
--
-- Every change is additive; existing tables and policies are untouched.
-- Must be executed manually in Supabase (SQL Editor) like prior migrations.

-- 1. Business profile ---------------------------------------------------------

-- Canonical NUI shape at the database level (mirrors src/modules/users/nui.ts):
-- 6-10 alphanumeric characters. This mirrors application validation; it is a
-- second line of defense, not a replacement for it.
create or replace function public.is_valid_nui(value text)
returns boolean
language sql
immutable
as $$
  select value similar to '[A-Za-z0-9]{6,10}'
$$;

create table public.business_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  -- Kosovo business registration number (ARBK NUI), stored normalized
  -- (trimmed, upper-cased). Uniqueness is enforced at the database level:
  -- two business accounts cannot claim the same NUI.
  business_nui text not null unique check (public.is_valid_nui(business_nui)),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_profiles_nui_idx on public.business_profiles (business_nui);

-- 2. handle_new_user extension (atomic business signup) -----------------------

-- Recreate the trigger function to also persist the business identity carried
-- in signup metadata. Runs inside the auth.users insert transaction: if the
-- NUI is missing/invalid/duplicate for a business signup, the whole signup
-- fails instead of creating a partially configured account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_type text := lower(coalesce(new.raw_user_meta_data ->> 'account_type', 'individual'));
  raw_nui text := nullif(new.raw_user_meta_data ->> 'business_nui', '');
  normalized_nui text;
begin
  insert into public.users (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));

  if account_type = 'business' then
    normalized_nui := upper(btrim(coalesce(raw_nui, '')));

    if normalized_nui is null or normalized_nui !~ '^[A-Za-z0-9]{6,10}$' then
      raise exception 'Business signup requires a valid business NUI'
        using errcode = 'check_violation';
    end if;

    insert into public.business_profiles (user_id, business_nui)
    values (new.id, normalized_nui)
    on conflict (user_id) do update
      set business_nui = excluded.business_nui, updated_at = now();
  end if;

  return new;
end;
$$;

-- The original trigger (auth_user_created) stays registered; it now executes
-- the extended function. No trigger recreation needed.

-- 3. RLS ----------------------------------------------------------------------

alter table public.business_profiles enable row level security;

-- A business sees and manages only its own profile row. Everyone else
-- (including other businesses) gets nothing from direct table access.
create policy business_profiles_select_own on public.business_profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy business_profiles_insert_own on public.business_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy business_profiles_update_own on public.business_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. NUI immutability guard ----------------------------------------------------

-- Business NUI is a verified identity anchor: a user cannot swap their NUI to
-- gain another business's records. Server-side workflows may still set it via
-- the service role, which bypasses RLS but not this trigger.
create or replace function public.protect_business_nui()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.business_nui is distinct from old.business_nui then
    raise exception 'Business NUI cannot be changed after registration'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger business_profiles_protect_nui
  before update on public.business_profiles
  for each row execute function public.protect_business_nui();

-- 5. updated_at trigger ---------------------------------------------------------

create trigger business_profiles_set_updated_at
  before update on public.business_profiles
  for each row execute function public.set_updated_at();
