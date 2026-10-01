-- Digital Grants & Subsidies Management: Stage 1 domain foundation.
-- Auth identities live in auth.users; public.users is the application profile/role record.

create type public.user_role as enum ('APPLICANT', 'MUNICIPAL_EMPLOYEE', 'EVALUATOR', 'ADMIN');
create type public.grant_status as enum ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
create type public.requirement_type as enum ('ELIGIBILITY', 'DOCUMENT', 'FINANCIAL', 'APPLICANT', 'OTHER');
create type public.application_status as enum ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUESTED', 'DECIDED', 'WITHDRAWN');
create type public.document_status as enum ('UPLOADED', 'REPLACEMENT_REQUESTED', 'ARCHIVED');
create type public.eligibility_result as enum ('PENDING', 'PASSED', 'FAILED');
create type public.verification_status as enum ('PENDING', 'VERIFIED', 'FLAGGED', 'FAILED');
create type public.evaluation_status as enum ('DRAFT', 'SUBMITTED');
create type public.notification_type as enum ('APPLICATION_STATUS', 'CORRECTION_REQUEST', 'SYSTEM');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'APPLICANT',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.municipality_members (
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (municipality_id, user_id)
);

create table public.grants (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  status public.grant_status not null default 'DRAFT',
  funding_amount numeric(14, 2) check (funding_amount is null or funding_amount >= 0),
  funding_currency char(3),
  application_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((funding_amount is null and funding_currency is null) or (funding_amount is not null and funding_currency is not null))
);

create table public.grant_requirements (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.grants(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  type public.requirement_type not null,
  is_required boolean not null default true,
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.grants(id) on delete restrict,
  applicant_id uuid not null references public.users(id) on delete restrict,
  status public.application_status not null default 'DRAFT',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grant_id, applicant_id),
  check ((status = 'SUBMITTED' and submitted_at is not null) or status <> 'SUBMITTED')
);

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  requirement_id uuid references public.grant_requirements(id) on delete set null,
  file_name text not null check (char_length(trim(file_name)) > 0),
  storage_path text not null unique check (char_length(trim(storage_path)) > 0),
  document_type text not null check (char_length(trim(document_type)) > 0),
  status public.document_status not null default 'UPLOADED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.eligibility_checks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  requirement_id uuid references public.grant_requirements(id) on delete set null,
  result public.eligibility_result not null default 'PENDING',
  reason text,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique nulls not distinct (application_id, requirement_id)
);

create table public.document_verifications (
  id uuid primary key default gen_random_uuid(),
  application_document_id uuid not null references public.application_documents(id) on delete restrict,
  status public.verification_status not null default 'PENDING',
  extracted_data jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_data) = 'object'),
  flags jsonb not null default '[]'::jsonb check (jsonb_typeof(flags) = 'array'),
  confidence numeric(5, 4) check (confidence is null or confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.grants(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  maximum_score numeric(8, 2) not null check (maximum_score > 0),
  weight numeric(8, 4) not null default 1 check (weight > 0),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grant_id, display_order)
);

-- Explicit assignments are the minimum relationship needed to keep evaluators scoped.
create table public.evaluation_assignments (
  application_id uuid not null references public.applications(id) on delete restrict,
  evaluator_id uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  primary key (application_id, evaluator_id)
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  evaluator_id uuid not null references public.users(id) on delete restrict,
  score numeric(10, 2) check (score is null or score >= 0),
  comment text,
  status public.evaluation_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, evaluator_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  application_id uuid references public.applications(id) on delete set null,
  type public.notification_type not null,
  title text not null check (char_length(trim(title)) > 0),
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null check (char_length(trim(action)) > 0),
  entity_type text not null check (char_length(trim(entity_type)) > 0),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index grants_municipality_status_idx on public.grants (municipality_id, status);
create index grants_deadline_idx on public.grants (application_deadline) where status = 'PUBLISHED';
create index grant_requirements_grant_idx on public.grant_requirements (grant_id);
create index applications_applicant_status_idx on public.applications (applicant_id, status);
create index applications_grant_status_idx on public.applications (grant_id, status);
create index application_documents_application_idx on public.application_documents (application_id);
create index eligibility_checks_application_idx on public.eligibility_checks (application_id);
create index document_verifications_document_idx on public.document_verifications (application_document_id);
create index evaluation_criteria_grant_idx on public.evaluation_criteria (grant_id);
create index evaluation_assignments_evaluator_idx on public.evaluation_assignments (evaluator_id);
create index evaluations_application_idx on public.evaluations (application_id);
create index evaluations_evaluator_idx on public.evaluations (evaluator_id);
create index notifications_user_read_idx on public.notifications (user_id, read_at);
create index audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN'); $$;

create or replace function public.is_municipality_member(target_municipality_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.municipality_members m
    join public.users u on u.id = m.user_id
    where m.municipality_id = target_municipality_id
      and m.user_id = auth.uid()
      and u.role in ('MUNICIPAL_EMPLOYEE', 'ADMIN')
  );
$$;

create or replace function public.can_access_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    join public.grants g on g.id = a.grant_id
    where a.id = target_application_id
      and (a.applicant_id = auth.uid() or public.is_municipality_member(g.municipality_id)
        or exists (select 1 from public.evaluation_assignments ea where ea.application_id = a.id and ea.evaluator_id = auth.uid())
        or public.is_admin())
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger municipalities_set_updated_at before update on public.municipalities for each row execute function public.set_updated_at();
create trigger grants_set_updated_at before update on public.grants for each row execute function public.set_updated_at();
create trigger grant_requirements_set_updated_at before update on public.grant_requirements for each row execute function public.set_updated_at();
create trigger applications_set_updated_at before update on public.applications for each row execute function public.set_updated_at();
create trigger application_documents_set_updated_at before update on public.application_documents for each row execute function public.set_updated_at();
create trigger document_verifications_set_updated_at before update on public.document_verifications for each row execute function public.set_updated_at();
create trigger evaluation_criteria_set_updated_at before update on public.evaluation_criteria for each row execute function public.set_updated_at();
create trigger evaluations_set_updated_at before update on public.evaluations for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.municipalities enable row level security;
alter table public.municipality_members enable row level security;
alter table public.grants enable row level security;
alter table public.grant_requirements enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.eligibility_checks enable row level security;
alter table public.document_verifications enable row level security;
alter table public.evaluation_criteria enable row level security;
alter table public.evaluation_assignments enable row level security;
alter table public.evaluations enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "users read own profile or admin" on public.users for select using (id = auth.uid() or public.is_admin());
create policy "users update own profile or admin" on public.users for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "municipalities visible with published grants or membership" on public.municipalities for select using (public.is_municipality_member(id) or public.is_admin() or exists (select 1 from public.grants g where g.municipality_id = id and g.status = 'PUBLISHED'));
create policy "memberships readable by members or admin" on public.municipality_members for select using (user_id = auth.uid() or public.is_municipality_member(municipality_id) or public.is_admin());
create policy "published grants are public; members see own" on public.grants for select using (status = 'PUBLISHED' or public.is_municipality_member(municipality_id) or public.is_admin());
create policy "members manage own municipality grants" on public.grants for all using (public.is_municipality_member(municipality_id) or public.is_admin()) with check (public.is_municipality_member(municipality_id) or public.is_admin());
create policy "requirements follow grant visibility" on public.grant_requirements for select using (exists (select 1 from public.grants g where g.id = grant_id and (g.status = 'PUBLISHED' or public.is_municipality_member(g.municipality_id) or public.is_admin())));
create policy "members manage grant requirements" on public.grant_requirements for all using (exists (select 1 from public.grants g where g.id = grant_id and (public.is_municipality_member(g.municipality_id) or public.is_admin()))) with check (exists (select 1 from public.grants g where g.id = grant_id and (public.is_municipality_member(g.municipality_id) or public.is_admin())));
create policy "applications follow application access" on public.applications for select using (applicant_id = auth.uid() or public.is_municipality_member((select municipality_id from public.grants where id = grant_id)) or public.is_admin() or exists (select 1 from public.evaluation_assignments ea where ea.application_id = id and ea.evaluator_id = auth.uid()));
create policy "applicants create draft applications for published grants" on public.applications for insert with check (applicant_id = auth.uid() and status = 'DRAFT' and exists (select 1 from public.grants g where g.id = grant_id and g.status = 'PUBLISHED'));
create policy "applicants update own editable applications" on public.applications for update using (applicant_id = auth.uid()) with check (applicant_id = auth.uid() and status in ('DRAFT', 'WITHDRAWN'));
create policy "documents follow application access" on public.application_documents for select using (public.can_access_application(application_id));
create policy "applicants manage own documents" on public.application_documents for all using (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid()) or public.is_admin()) with check (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid()) or public.is_admin());
create policy "eligibility checks follow application access" on public.eligibility_checks for select using (public.can_access_application(application_id));
create policy "document verification follows application access" on public.document_verifications for select using (public.can_access_application((select application_id from public.application_documents where id = application_document_id)));
create policy "criteria follow grant visibility" on public.evaluation_criteria for select using (exists (select 1 from public.grants g where g.id = grant_id and (g.status = 'PUBLISHED' or public.is_municipality_member(g.municipality_id) or public.is_admin())));
create policy "members manage evaluation criteria" on public.evaluation_criteria for all using (exists (select 1 from public.grants g where g.id = grant_id and (public.is_municipality_member(g.municipality_id) or public.is_admin()))) with check (exists (select 1 from public.grants g where g.id = grant_id and (public.is_municipality_member(g.municipality_id) or public.is_admin())));
create policy "evaluators read own assignments" on public.evaluation_assignments for select using (evaluator_id = auth.uid() or public.is_admin());
create policy "evaluations visible to evaluator municipality or admin" on public.evaluations for select using (evaluator_id = auth.uid() or public.is_municipality_member((select g.municipality_id from public.applications a join public.grants g on g.id = a.grant_id where a.id = application_id)) or public.is_admin());
create policy "assigned evaluators manage own evaluations" on public.evaluations for all using ((evaluator_id = auth.uid() and exists (select 1 from public.evaluation_assignments ea where ea.application_id = evaluations.application_id and ea.evaluator_id = auth.uid())) or public.is_admin()) with check ((evaluator_id = auth.uid() and exists (select 1 from public.evaluation_assignments ea where ea.application_id = evaluations.application_id and ea.evaluator_id = auth.uid())) or public.is_admin());
create policy "users read own notifications" on public.notifications for select using (user_id = auth.uid() or public.is_admin());
create policy "users update own notifications" on public.notifications for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "audit logs visible to actor or admin" on public.audit_logs for select using (actor_id = auth.uid() or public.is_admin());
