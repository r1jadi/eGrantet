-- Appeals + business profile documents.
--
-- 1. Appeals: an applicant may appeal a REJECTED decision within a window.
--    Mirrors the review-side letter flow: submission, municipal review, final
--    decision, all audited and notified. RLS keeps appeals owner/municipality
--    scoped like applications.
-- 2. Business documents: per-business uploaded documents (private bucket),
--    replacing the UI-only upload stub with real persistence.
--
-- Must be executed manually in Supabase (SQL Editor) like prior migrations.

-- 1. Appeals -----------------------------------------------------------------

create type public.appeal_status as enum ('SUBMITTED', 'UNDER_REVIEW', 'DECISION_MADE');

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  applicant_id uuid not null references public.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 1 and 200),
  explanation text not null check (char_length(btrim(explanation)) between 1 and 4000),
  status public.appeal_status not null default 'SUBMITTED',
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One appeal per rejected application.
  unique (application_id)
);

create index appeals_applicant_idx on public.appeals (applicant_id);
create index appeals_status_idx on public.appeals (status);

alter table public.appeals enable row level security;

create policy "applicants manage own appeals" on public.appeals for all
to authenticated
using (applicant_id = auth.uid())
with check (applicant_id = auth.uid());

create policy "municipality reviews appeals for own applications" on public.appeals for select
to authenticated
using (
  public.is_municipality_member(
    (select g.municipality_id from public.applications a join public.grants g on g.id = a.grant_id where a.id = application_id)
  )
  or public.is_admin()
);

create policy "municipality updates appeal status" on public.appeals for update
to authenticated
using (
  public.is_municipality_member(
    (select g.municipality_id from public.applications a join public.grants g on g.id = a.grant_id where a.id = application_id)
  )
  or public.is_admin()
)
with check (true);

create trigger appeals_set_updated_at before update on public.appeals
for each row execute function public.set_updated_at();

-- 2. Business documents ---------------------------------------------------------

create table public.business_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_name text not null check (char_length(btrim(file_name)) > 0),
  storage_path text not null unique,
  document_type text not null default 'OTHER',
  content_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  created_at timestamptz not null default now()
);

create index business_documents_user_idx on public.business_documents (user_id);

alter table public.business_documents enable row level security;

create policy "businesses manage own documents" on public.business_documents for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Private bucket: business-documents/{userId}/{documentId}/{fileName}
insert into storage.buckets (id, name, public)
values ('business-documents', 'business-documents', false)
on conflict (id) do nothing;

create policy "businesses upload own documents" on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-documents'
  and exists (select 1 from public.business_profiles bp where bp.user_id = auth.uid())
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "businesses read own documents" on storage.objects for select to authenticated
using (
  bucket_id = 'business-documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "businesses delete own documents" on storage.objects for delete to authenticated
using (
  bucket_id = 'business-documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);
