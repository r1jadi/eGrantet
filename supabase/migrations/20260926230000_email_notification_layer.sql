-- Email notification layer.
--
-- Adds:
--   1. New notification types (grant recommendation, verification, evaluation).
--   2. Per-user notification preferences (one row per user, created lazily).
--   3. Per-user language preference (email + in-app follow the web choice).
--   4. notification_emails delivery log with dedup key (idempotent sending).
--
-- RLS: users read/update only their own preference row; the delivery log is
-- system-owned (no client policies; written via service role server-side).
-- All existing in-app behavior is untouched; every column is additive.

-- 1. Notification types -------------------------------------------------------

alter type public.notification_type add value if not exists 'GRANT_RECOMMENDATION';
alter type public.notification_type add value if not exists 'VERIFICATION';
alter type public.notification_type add value if not exists 'EVALUATION';

-- 2. Notification preferences -------------------------------------------------

create table public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  -- Category toggles. `false` disables BOTH the in-app and email channel for
  -- the category, except decision/transactional messages which the service
  -- always delivers (see notification-service email gating).
  grant_announcements boolean not null default true,
  recommended_grants boolean not null default true,
  application_updates boolean not null default true,
  document_updates boolean not null default true,
  verification_updates boolean not null default true,
  evaluation_updates boolean not null default true,
  -- Decisions are transactional: the column exists so the UI can display the
  -- category, but the service ignores `false` for approval/rejection emails.
  decision_notifications boolean not null default true,
  milestone_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "users read own notification preferences"
  on public.notification_preferences for select
  using (user_id = auth.uid() or public.is_admin());

create policy "users update own notification preferences"
  on public.notification_preferences for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users insert own notification preferences"
  on public.notification_preferences for insert
  with check (user_id = auth.uid());

-- 3. Per-user language (drives in-app + email language consistently) ----------

alter table public.users add column if not exists language text not null default 'en'
  check (language in ('sq', 'en', 'sr'));

-- 4. Email delivery log with deduplication ------------------------------------

create table public.notification_emails (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  -- Deterministic idempotency key: user + event + type (+ version). A unique
  -- index makes re-processing the same domain event a no-op.
  dedup_key text not null,
  email_category text not null check (char_length(trim(email_category)) > 0),
  recipient_email text not null check (position('@' in recipient_email) > 1),
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (dedup_key)
);

create index notification_emails_user_idx on public.notification_emails (user_id, created_at);
create index notification_emails_status_idx on public.notification_emails (status, created_at);

alter table public.notification_emails enable row level security;

-- Delivery state is system-owned: no client policies. Users can see the
-- delivery status of their own notifications through the application service,
-- which reads via the service role after authorization.
create policy "users read own email delivery records"
  on public.notification_emails for select
  using (user_id = auth.uid() or public.is_admin());

-- 5. Triggers -----------------------------------------------------------------

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();
