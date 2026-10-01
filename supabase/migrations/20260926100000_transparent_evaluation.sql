-- Transparent evaluation & anti-corruption scoring.
-- 1. Criteria gain an active flag, a scoring mode (manual vs. deterministic
--    automatic scoring from trusted application data) and its configuration.
-- 2. Evaluations gain per-criterion scores stored as JSON for deterministic,
--    reproducible totals (the `score` column remains the cached total).
-- 3. Assignments gain a blind-evaluation flag (identity masking per assignment).
-- 4. Audit logs become append-only at the database level: no role, including
--    service code, can UPDATE or DELETE audit history.
-- 5. RLS is split so evaluators can update their own evaluations while
--    municipality members/admins keep read access.

create type public.criterion_scoring_mode as enum ('MANUAL', 'AUTOMATIC');

alter table public.evaluation_criteria
  add column is_active boolean not null default true,
  add column scoring_mode public.criterion_scoring_mode not null default 'MANUAL',
  add column auto_config jsonb not null default '{}'::jsonb check (jsonb_typeof(auto_config) = 'object');

alter table public.evaluations
  add column criterion_scores jsonb not null default '{}'::jsonb check (jsonb_typeof(criterion_scores) = 'object');

alter table public.evaluation_assignments
  add column blind boolean not null default true;

-- Append-only audit history. Applies to every role: the application writes
-- audit rows through service code, and nothing may rewrite them afterwards.
create or replace function public.forbid_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are append-only (attempted %)', tg_op;
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.forbid_audit_mutation();

drop trigger if exists audit_logs_no_delete on public.audit_logs;
create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.forbid_audit_mutation();

-- Evaluations: separate read policy (municipality transparency) from the
-- write policy (only the assigned evaluator), replacing the blanket FOR ALL.
drop policy if exists "evaluations visible to evaluator municipality or admin" on public.evaluations;
drop policy if exists "assigned evaluators manage own evaluations" on public.evaluations;
create policy "evaluations visible to evaluator municipality or admin" on public.evaluations
  for select using (
    evaluator_id = auth.uid()
    or public.is_municipality_member((select g.municipality_id from public.applications a join public.grants g on g.id = a.grant_id where a.id = application_id))
    or public.is_admin()
  );
create policy "assigned evaluators update own evaluations" on public.evaluations
  for update to authenticated
  using (
    evaluator_id = auth.uid()
    and exists (select 1 from public.evaluation_assignments ea where ea.application_id = evaluations.application_id and ea.evaluator_id = auth.uid())
  )
  with check (
    evaluator_id = auth.uid()
    and exists (select 1 from public.evaluation_assignments ea where ea.application_id = evaluations.application_id and ea.evaluator_id = auth.uid())
  );

-- Assignments: evaluators already read their own; municipality members and
-- admins can also read so they can manage assignments and progress.
drop policy if exists "evaluators read own assignments" on public.evaluation_assignments;
create policy "evaluators read own assignments" on public.evaluation_assignments
  for select using (
    evaluator_id = auth.uid()
    or public.is_admin()
    or public.is_municipality_member((select g.municipality_id from public.applications a join public.grants g on g.id = a.grant_id where a.id = application_id))
  );
