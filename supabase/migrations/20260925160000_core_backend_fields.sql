alter type public.application_status add value if not exists 'APPROVED';
alter type public.application_status add value if not exists 'REJECTED';
alter type public.requirement_type add value if not exists 'PROJECT';

alter table public.grants
  add column maximum_amount_per_applicant numeric(14, 2) check (maximum_amount_per_applicant is null or maximum_amount_per_applicant >= 0),
  add constraint grants_maximum_amount_within_funding check (maximum_amount_per_applicant is null or funding_amount is null or maximum_amount_per_applicant <= funding_amount);

alter table public.grant_requirements
  add column display_order integer not null default 0 check (display_order >= 0);
create unique index grant_requirements_grant_display_order_idx on public.grant_requirements (grant_id, display_order);

alter table public.applications
  add column answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object');

alter table public.application_documents
  add column content_type text not null default 'application/octet-stream',
  add column file_size_bytes bigint not null default 0 check (file_size_bytes >= 0);

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

create policy "applicants upload own application documents" on storage.objects for insert to authenticated
with check (
  bucket_id = 'application-documents'
  and exists (select 1 from public.applications a where a.id::text = (storage.foldername(name))[2] and a.applicant_id = auth.uid())
);
create policy "application participants read documents" on storage.objects for select to authenticated
using (
  bucket_id = 'application-documents'
  and public.can_access_application(((storage.foldername(name))[2])::uuid)
);
create policy "applicants delete own draft documents" on storage.objects for delete to authenticated
using (
  bucket_id = 'application-documents'
  and exists (select 1 from public.applications a where a.id::text = (storage.foldername(name))[2] and a.applicant_id = auth.uid() and a.status = 'DRAFT')
);
