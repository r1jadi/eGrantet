-- Profiles are self-service only for the display name. Role changes and
-- membership administration remain privileged server-side operations.
drop policy if exists "users update own profile or admin" on public.users;
create policy "users update own display name" on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

revoke update on table public.users from authenticated;
grant update (full_name) on table public.users to authenticated;
