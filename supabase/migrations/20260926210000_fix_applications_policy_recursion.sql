-- Fixes Postgres error 42P17 ("infinite recursion detected in policy for
-- relation applications"). The applications SELECT policy contained an inline
-- exists() subquery over evaluation_assignments, while the
-- evaluation_assignments SELECT policy subqueried back into applications.
-- Postgres evaluates RLS subqueries with row-level security applied, so the
-- two policies formed a cycle and every municipal/applicant query touching
-- applications failed.
--
-- Resolution follows the existing pattern in this schema: cross-table checks
-- go through `security definer` helper functions (see is_admin,
-- is_municipality_member, can_access_application), which bypass RLS on the
-- tables they read and therefore cannot recurse.

create or replace function public.is_application_evaluator(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.evaluation_assignments ea
    where ea.application_id = target_application_id
      and ea.evaluator_id = auth.uid()
  );
$$;

drop policy if exists "applications follow application access" on public.applications;
create policy "applications follow application access" on public.applications for select using (
  applicant_id = auth.uid()
  or public.is_municipality_member((select municipality_id from public.grants where id = grant_id))
  or public.is_admin()
  or public.is_application_evaluator(id)
);

drop policy if exists "evaluators read own assignments" on public.evaluation_assignments;
create policy "evaluators read own assignments" on public.evaluation_assignments for select using (
  evaluator_id = auth.uid()
  or public.is_admin()
  or public.can_access_application(application_id)
);
