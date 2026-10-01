-- Automated milestones & post-award tracking.
-- A grantee project is created when an application is APPROVED; the beneficiary
-- then tracks milestones and submits evidence (invoices, receipts, photos)
-- progressively. Uses the same storage/RLS patterns as application documents.

create type public.project_status as enum ('ACTIVE', 'COMPLETED', 'SUSPENDED');
create type public.milestone_status as enum ('PENDING', 'SUBMITTED', 'CORRECTION_REQUESTED', 'APPROVED');

create table public.grantee_projects (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  grantee_id uuid not null references public.users(id) on delete restrict,
  title text not null check (char_length(trim(title)) > 0),
  awarded_amount numeric(14, 2) not null check (awarded_amount >= 0),
  awarded_currency char(3) not null default 'EUR',
  project_start date not null,
  project_end date not null,
  status public.project_status not null default 'ACTIVE',
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (project_end >= project_start)
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.grantee_projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  due_date date not null,
  requires_evidence boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  status public.milestone_status not null default 'PENDING',
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_milestones_project_idx on public.project_milestones (project_id, display_order);

create type public.submission_kind as enum ('EVIDENCE', 'PHOTO', 'NOTE');

create table public.milestone_submissions (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.project_milestones(id) on delete cascade,
  grantee_id uuid not null references public.users(id) on delete restrict,
  kind public.submission_kind not null default 'EVIDENCE',
  message text not null default '',
  status public.milestone_status not null default 'SUBMITTED',
  review_comment text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index milestone_submissions_milestone_idx on public.milestone_submissions (milestone_id, created_at desc);

create table public.milestone_evidence (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.milestone_submissions(id) on delete cascade,
  file_name text not null check (char_length(trim(file_name)) > 0),
  storage_path text not null unique check (char_length(trim(storage_path)) > 0),
  document_type text not null check (char_length(trim(document_type)) > 0),
  content_type text not null default 'application/octet-stream',
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  created_at timestamptz not null default now()
);
create index milestone_evidence_submission_idx on public.milestone_evidence (submission_id);

-- Access helper mirroring can_access_application: grantee, municipality members,
-- admins; evaluators are deliberately excluded (post-award is not their scope).
create or replace function public.can_access_grantee_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.grantee_projects gp
    where gp.id = target_project_id
      and (gp.grantee_id = auth.uid()
        or public.is_municipality_member(gp.municipality_id)
        or public.is_admin())
  )
$$;

alter table public.grantee_projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.milestone_submissions enable row level security;
alter table public.milestone_evidence enable row level security;

create policy "grantee projects visible to participants" on public.grantee_projects for select
  using (grantee_id = auth.uid() or public.is_municipality_member(municipality_id) or public.is_admin());
create policy "municipality members manage grantee projects" on public.grantee_projects for all
  using (public.is_municipality_member(municipality_id) or public.is_admin())
  with check (public.is_municipality_member(municipality_id) or public.is_admin());

create policy "milestones follow project access" on public.project_milestones for select
  using (public.can_access_grantee_project(project_id));
create policy "municipality members manage milestones" on public.project_milestones for all
  using (exists (select 1 from public.grantee_projects gp where gp.id = project_id and (public.is_municipality_member(gp.municipality_id) or public.is_admin())))
  with check (exists (select 1 from public.grantee_projects gp where gp.id = project_id and (public.is_municipality_member(gp.municipality_id) or public.is_admin())));

create policy "submissions follow milestone access" on public.milestone_submissions for select
  using (public.can_access_grantee_project((select project_id from public.project_milestones where id = milestone_id)));
create policy "grantee submits own milestone updates" on public.milestone_submissions for insert to authenticated
  with check (grantee_id = auth.uid() and exists (
    select 1 from public.project_milestones m join public.grantee_projects gp on gp.id = m.project_id
    where m.id = milestone_id and gp.grantee_id = auth.uid()
  ));

create policy "evidence follows submission access" on public.milestone_evidence for select
  using (public.can_access_grantee_project((select project_id from public.project_milestones where id = (select milestone_id from public.milestone_submissions where id = submission_id))));
create policy "grantee uploads own evidence metadata" on public.milestone_evidence for insert to authenticated
  with check (exists (
    select 1 from public.milestone_submissions ms join public.project_milestones m on m.id = ms.milestone_id
    join public.grantee_projects gp on gp.id = m.project_id
    where ms.id = submission_id and ms.grantee_id = auth.uid()
  ));

-- Storage: evidence lives under grantee-projects/{projectId}/{submissionId}/.
insert into storage.buckets (id, name, public)
values ('grantee-projects', 'grantee-projects', false)
on conflict (id) do nothing;

create policy "grantees upload own evidence" on storage.objects for insert to authenticated
with check (
  bucket_id = 'grantee-projects'
  and exists (
    select 1 from public.grantee_projects gp
    where gp.id::text = (storage.foldername(name))[2]
      and gp.grantee_id = auth.uid()
  )
);
create policy "project participants read evidence" on storage.objects for select to authenticated
using (
  bucket_id = 'grantee-projects'
  and public.can_access_grantee_project(((storage.foldername(name))[2])::uuid)
);

-- Notifications gain milestone events.
alter type public.notification_type add value if not exists 'MILESTONE';
