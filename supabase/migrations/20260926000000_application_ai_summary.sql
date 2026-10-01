-- Persisted AI-generated application summaries (municipality review aid).
-- Additive: two nullable columns; no existing data is touched.

alter table public.applications
  add column ai_summary text;

alter table public.applications
  add column ai_summary_generated_at timestamptz;

-- The summary is written only by trusted server code (service role, which
-- bypasses RLS by design) and read through the existing applications
-- policies; no new public-facing policy surface is introduced.
