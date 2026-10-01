-- AI verification pipeline: per-document AI analysis, per-requirement
-- verification results, and an application-level verification lifecycle.
--
-- Existing tables reused (no changes):
--   document_verifications   (analysis rows per application_document)
--   eligibility_checks       (deterministic per-requirement results)
--   applications.ai_summary  (AI summary)
--
-- New tables:
--   requirement_verifications   one row per requirement x verification run
--   application_verifications   one lifecycle row per application
--
-- RLS follows the existing can_access_application() policy shape: applicants
-- read their own application's verification data; municipality members,
-- assigned evaluators, and platform admins read through the same helper.
-- Writes happen only server-side (service role); no client mutation policies.

-- Wider status vocabulary for AI document analysis. The original enum lacks
-- explicit unreadable/incomplete outcomes; the engine maps analysis outcomes
-- onto these values.
alter type public.verification_status add value if not exists 'UNREADABLE';
alter type public.verification_status add value if not exists 'NEEDS_REVIEW';

-- Lifecycle of the application-level verification workflow.
create type public.application_verification_status as enum (
  'NOT_STARTED',
  'PROCESSING',
  'COMPLETED',
  'NEEDS_REVIEW',
  'FAILED'
);

-- Origin of a verification finding: deterministic rules never get overwritten
-- by AI findings and reviewers must be able to tell the apart.
create type public.verification_source as enum ('DETERMINISTIC', 'AI', 'SYSTEM');

-- Requirement outcomes are deliberately richer than eligibility_results:
-- NEEDS_REVIEW (evidence insufficient) and NOT_VERIFIABLE (no applicable
-- evidence source) do not map onto PASSED/FAILED without losing meaning.
create type public.requirement_verification_result as enum (
  'PASS',
  'FAIL',
  'NEEDS_REVIEW',
  'NOT_VERIFIABLE'
);

create table public.requirement_verifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  requirement_id uuid not null references public.grant_requirements(id) on delete cascade,
  result public.requirement_verification_result not null,
  source public.verification_source not null,
  status public.application_verification_status not null default 'COMPLETED',
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  explanation text not null default '',
  confidence numeric(5, 4) check (confidence is null or confidence between 0 and 1),
  run_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (application_id, requirement_id)
);

create index requirement_verifications_application_idx
  on public.requirement_verifications (application_id);
create index requirement_verifications_run_idx
  on public.requirement_verifications (application_id, run_id);

create table public.application_verifications (
  application_id uuid primary key references public.applications(id) on delete cascade,
  status public.application_verification_status not null default 'NOT_STARTED',
  run_id uuid,
  missing_document_requirement_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(missing_document_requirement_ids) = 'array'),
  inconsistencies jsonb not null default '[]'::jsonb check (jsonb_typeof(inconsistencies) = 'array'),
  summary text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index application_verifications_status_idx
  on public.application_verifications (status);

-- Read access follows the application access boundary (applicant, municipality
-- member, assigned evaluator, platform admin).
create policy "requirement verifications follow application access"
  on public.requirement_verifications for select
  using (public.can_access_application(application_id));

create policy "application verifications follow application access"
  on public.application_verifications for select
  using (public.can_access_application(application_id));

alter table public.requirement_verifications enable row level security;
alter table public.application_verifications enable row level security;

-- Keep updated_at current on verification rows.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists requirement_verifications_set_updated_at
  on public.requirement_verifications;
create trigger requirement_verifications_set_updated_at
  before update on public.requirement_verifications
  for each row execute function public.set_updated_at();

drop trigger if exists application_verifications_set_updated_at
  on public.application_verifications;
create trigger application_verifications_set_updated_at
  before update on public.application_verifications
  for each row execute function public.set_updated_at();
