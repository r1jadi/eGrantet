# Architecture

## Decision

The project is one Next.js modular monolith. A two-person hackathon team benefits from a single deployable, database, and codebase while domain modules maintain clean ownership. No microservices, queues, separate backends, or separate AI service are planned.

## System shape

```text
App Router UI
  -> Server Actions / selected API routes
    -> Domain services and contracts
      -> Supabase / external provider adapters
```

Route groups organize future public, applicant, municipality, and evaluator screens. They do not own business logic. Each feature belongs to the appropriate domain in `src/modules`; common technical concerns live in `src/lib`.

## Module boundaries

`grants` owns grant configuration and requirements. `applications` owns lifecycle/status. `documents` owns metadata and storage references. `eligibility` owns deterministic rule evaluation and has no OpenAI dependency. `ai` owns provider-independent interfaces and provider adapters. `evaluations`, `notifications`, `audit`, and `users` own their named concepts.

Allowed dependency paths are deliberate, for example: Applications may request an Eligibility contract; Documents may request an AI contract. The UI never contacts OpenAI. Modules should expose stable types through their `index.ts` rather than importing internal files across domains.

## AI boundary

`DocumentAnalysisService` and `ApplicationSummaryService` are contracts in `modules/ai`. Future OpenAI adapters implement these contracts behind server-only code in `lib/openai` and the AI module. Callers receive typed results without provider knowledge. AI results are advisory; deterministic eligibility remains in `eligibility`, and human reviewers make decisions.

## Authentication boundary

Supabase SSR clients are separated into browser and server clients. `src/proxy.ts` refreshes sessions but is not an authorization boundary. Server-only authentication helpers load the authenticated user/profile and enforce role and municipality membership checks; frontend role values are never trusted. The service-role client is server-only and is used only by service implementations after these checks. User roles are `APPLICANT`, `MUNICIPAL_EMPLOYEE`, `EVALUATOR`, and `ADMIN`. The reusable authorization policy also scopes applicant ownership and evaluator assignments for later domain services.

Platform-level administration adds an optional server-only email allowlist on top of the role model: when `ADMIN_EMAILS` is configured, the municipality/admin area layout and its Server Actions additionally require an allowlisted email (`requireAdminAccess` / `assertAdminAreaAccess` in `lib/auth`, policy in `lib/auth/admin-allowlist`). An unconfigured or empty variable never grants extra access and never locks the area — the database role/membership model governs unchanged. The allowlist is never exposed to the client.

## Implemented core workflows

Grant services create and update drafts, configure ordered requirements, and enforce the `DRAFT -> PUBLISHED -> CLOSED -> ARCHIVED` lifecycle. Published-grant discovery is database-paginated and filtered, and public details expose only published grant configuration.

Application services create one draft per applicant/grant, persist validated answer objects, and enforce server-side submission prerequisites: grant availability, deadline, required configured answers, required documents, and editable status. Municipal status updates use the application lifecycle and generate applicant notifications. Document uploads use the private `application-documents` bucket with a UUID path (`applications/{applicationId}/{documentId}/{filename}`), content-type/size validation, ownership checks, and metadata persistence. Important grant, requirement, application, and document operations write server-owned audit records.

## Database strategy

Supabase PostgreSQL is the only database; Supabase Storage stores document files. Schema changes are committed as ordered SQL migrations under `supabase/migrations`; local Supabase configuration is in `supabase/config.toml`. The initial migration creates:

```text
auth.users -> public.users -> municipality_members -> municipalities
Municipality -> Grant -> GrantRequirement and EvaluationCriterion
User -> Application -> ApplicationDocument -> DocumentVerification
Application -> EligibilityCheck, EvaluationAssignment -> Evaluation, Notification
Any actor/action/entity -> AuditLog
```

`Application` links an applicant to a grant. Requirements and criteria belong to grants. Documents and verification records belong to applications/documents. `evaluation_assignments` is the minimal table used to scope evaluators before they can create an evaluation. `AuditLog` is polymorphic and deliberately uses `entity_type`/`entity_id` rather than fragile foreign keys.

The initial tables have UUID keys, timestamps, relevant foreign keys, check constraints, controlled PostgreSQL enums, JSONB only for flexible requirement/verification/audit payloads, and indexes for foreign-key and common lookup paths. Core records use `RESTRICT` deletion to preserve grant history; a few optional references use `SET NULL` where their historical record remains meaningful.

## Roles and RLS

Supabase Auth owns identities; an `auth.users` trigger creates the matching `public.users` profile with the default `APPLICANT` role. Roles are `APPLICANT`, `MUNICIPAL_EMPLOYEE`, `EVALUATOR`, and `ADMIN`. Municipality access uses `municipality_members`; only employee/admin membership grants municipality data access.

RLS is enabled on every public domain table. Profiles may be updated by authenticated users only through the `full_name` column; role and membership changes remain privileged server-side operations. Applicants can read their own records and create/edit only draft or withdrawn applications. Municipality members can read/manage grants, requirements, criteria, and view their municipality's applications. Evaluators only gain application access through an explicit evaluation assignment and can manage their own assigned evaluation. Notifications are private; audit logs are actor/admin readable. System-owned processing records have no client mutation policy and therefore require a future server-side/service-role workflow.

The model assumes one application per applicant per grant and one evaluation per assigned evaluator/application. Assignment creation, role administration, municipal onboarding, and evaluator workflows remain future work. Generated database types must be refreshed into `src/types/database.ts` with `npx supabase gen types typescript --linked` after the local Supabase CLI is authenticated and linked; module-owned contracts remain the application-level types.

## Validation, errors, and logging

Zod schemas live near their domain or in `lib/validation` when genuinely cross-domain; React Hook Form consumes their resolvers. `AppError` classifies validation, authentication, authorization, database, external-service, and AI failures. User messages remain safe. `logger` is a small server-side JSON logger for errors and important events; replace its sink later only if needed.

## Testing strategy

The quality gate is `npm test`, `npm run lint`, and `npm run build`. Lifecycle tests live alongside their services. Auth integration tests are opt-in (`RUN_SUPABASE_INTEGRATION_TESTS=true`) and require dedicated non-production credentials and scoped fixture IDs; they verify Supabase Auth and RLS without writing production data. Keep business tests inside their owning module rather than centralizing all tests in a shared folder.

## Scalability path

Start with domain services and indexes/migrations in the single Supabase database. Add background processing or provider-specific infrastructure only after a measured need. Contracts at the AI, notification, audit, and persistence boundaries permit replacement without prematurely distributing the system.
