# AGENTS.md

# Digital Grants & Subsidies Management

This repository contains a modular-monolith Next.js platform for managing municipal grants and subsidies.

The system is designed to make grant programs easier to configure, applications easier to complete, and municipal review more structured, transparent, and auditable.

The core principle is:

> **AI assists. Deterministic rules verify. Humans make final funding decisions.**

AI must never independently decide whether an applicant receives funding.

---

# 1. Mission

Build a real, functional grant-management platform suitable for a serious hackathon prototype and capable of evolving toward production.

The system should support the complete grant lifecycle:

```text
Municipality
    ↓
Create Grant
    ↓
Define Requirements
    ↓
Publish Grant
    ↓
Applicant Discovery
    ↓
Eligibility Pre-check
    ↓
Application
    ↓
Document Upload
    ↓
Automated Verification
    ↓
Municipality Review
    ↓
Evaluation
    ↓
Human Decision
    ↓
Applicant Notification
    ↓
Status Tracking
```

Do not implement fake workflows, placeholder business logic, or UI-only simulations when the assigned task requires real functionality.

---

# 2. Critical Rule: Inspect Before You Change

Before every task, you MUST inspect the latest repository state.

Never assume that the repository is in the state described by an old prompt, previous conversation, or previous commit.

At minimum inspect:

```text
git status
current branch
recent commits
repository structure
relevant source files
relevant tests
package.json
existing documentation
existing database/schema code
latest changes from other team members
```

Read the relevant documentation before implementation:

```text
AGENTS.md
ARCHITECTURE.md
TASKS.md
README.md
```

For a task inside a specific domain, inspect that domain's current implementation before creating new files.

If a previous implementation already solves part of the task:

* reuse it;
* extend it;
* fix it if necessary;
* do not duplicate it.

If the repository differs from the assumptions in the task description, adapt to the repository.

The repository is the source of truth.

---

# 3. Task Scope

Every agent task must have a clearly defined scope.

Implement only the assigned functionality.

Do not silently expand a task into unrelated features.

For example:

If the task is authentication:

```text
DO:
- authentication
- authorization
- user identity
- role checks
- membership checks

DO NOT:
- grants
- applications
- AI
- document processing
- evaluator UI
```

If the task is document storage:

```text
DO:
- storage
- upload
- metadata
- access control

DO NOT:
- AI document verification
- eligibility decisions
- evaluation
```

A task should be complete and functional within its scope, but unrelated functionality must remain untouched.

---

# 4. Real Functionality Only

When implementing a feature, build the real behavior required by the task.

Do not create:

* fake buttons;
* placeholder APIs;
* hardcoded successful responses;
* fake database records;
* mock functionality presented as production functionality;
* TODO-only implementations;
* empty service methods;
* UI that claims an operation succeeded when it did not;
* fake AI responses;
* fake eligibility decisions.

Mocks are allowed only when they are explicitly part of a test, development fixture, or clearly identified prototype boundary.

If a real external integration cannot be completed because credentials/API access are unavailable:

1. implement the correct abstraction;
2. implement everything that can genuinely work;
3. make the limitation explicit;
4. never pretend the integration is operational.

---

# 5. Product Principles

## 5.1 AI is assistive

AI may:

* extract information;
* classify documents;
* identify possible inconsistencies;
* summarize applications;
* explain detected issues;
* assist municipal staff.

AI must NOT independently:

* approve funding;
* reject funding;
* assign final eligibility;
* determine an applicant's final score;
* override deterministic rules;
* make an irreversible funding decision.

The final decision belongs to authorized humans.

---

## 5.2 Deterministic rules verify requirements

Requirements such as:

```text
registered in municipality
business age
maximum requested amount
required document
deadline
numeric limits
specific eligibility conditions
```

should be represented as deterministic, testable rules whenever possible.

Do not send deterministic eligibility decisions to an LLM.

The eligibility engine must remain independent of the AI provider.

---

## 5.3 Auditability

Important state changes should be traceable.

Where applicable, record:

* actor;
* action;
* timestamp;
* affected entity;
* relevant status transition;
* important context.

Never expose internal audit/security information unnecessarily to applicants.

Do not claim that an audit trail guarantees the absence of misconduct.

---

## 5.4 Human-in-the-loop

The platform assists municipal employees and evaluators.

It does not replace authorized human decision-makers.

Any workflow involving:

```text
approval
rejection
funding
evaluation
scoring
```

must have explicit authorization and human control.

---

# 6. Architecture

The application is a modular monolith.

The preferred dependency direction is:

```text
UI
 ↓
Server Actions / Route Handlers
 ↓
Services
 ↓
Domain / Repositories
 ↓
Supabase
```

For AI:

```text
Domain Service
 ↓
AI abstraction
 ↓
Provider adapter
 ↓
OpenAI
```

The UI must never directly call OpenAI.

The UI must never directly use a Supabase service-role client.

The UI should not directly contain persistence/business logic.

---

# 7. Technology Stack

Verify the actual repository before assuming a package or version.

The intended stack is:

* Next.js App Router
* React
* TypeScript strict mode
* Tailwind CSS
* shadcn/ui-compatible components
* Server Actions
* Supabase

  * PostgreSQL
  * Auth
  * Storage
* Zod
* React Hook Form
* OpenAI
* Resend
* Vercel

Do not add new infrastructure unless the task genuinely requires it.

Do not introduce:

* a separate Express/Nest backend;
* a second database;
* Redis;
* Kafka;
* Kubernetes;
* unnecessary microservices;
* a separate AI server.

Prefer the existing modular monolith.

---

# 8. Domain Modules

Business logic belongs inside domain modules.

Expected modules include:

```text
src/modules/
├── grants/
├── applications/
├── eligibility/
├── documents/
├── ai/
├── evaluations/
├── notifications/
├── audit/
└── users/
```

A mature module may contain:

```text
components/
actions/
services/
schemas/
types/
index.ts
```

Only create directories/files when they are actually needed.

Do not create empty structures for the sake of architecture.

---

# 9. Module Responsibilities

## grants

Responsible for:

* grant programs;
* grant lifecycle;
* grant configuration;
* grant requirements;
* publishing/closing/archive state.

Must NOT contain:

* application review logic;
* AI implementation;
* evaluator scoring.

---

## applications

Responsible for:

* application creation;
* draft lifecycle;
* application data;
* submission;
* application status;
* applicant ownership;
* correction workflow.

Must NOT contain:

* OpenAI implementation;
* provider-specific AI code.

---

## eligibility

Responsible for:

* deterministic requirements;
* eligibility rules;
* eligibility evaluation;
* eligibility results;
* explanations of deterministic failures.

Must remain independent of AI.

---

## documents

Responsible for:

* document metadata;
* storage references;
* document ownership;
* document status;
* requirement association;
* secure document access.

Must NOT contain AI business logic.

AI analysis belongs in `ai`.

---

## ai

Responsible for:

* provider-independent AI contracts;
* extraction;
* document analysis;
* classification;
* mismatch detection;
* summaries;
* AI provider adapters.

Business decisions must remain outside the AI provider layer.

---

## evaluations

Responsible for:

* evaluation criteria;
* evaluator assignments;
* scoring;
* evaluator comments;
* evaluation status;
* evaluation audit information.

---

## notifications

Responsible for:

* in-app notifications;
* email abstraction;
* notification events;
* delivery state where applicable.

---

## audit

Responsible for:

* audit contracts;
* audit events;
* actor/action/entity information;
* future audit persistence.

Audit logging should be server-side.

---

## users

Responsible for:

* user profiles;
* roles;
* authorization abstractions;
* municipality membership;
* user access boundaries.

---

# 10. Ownership and Collaboration

This project has two primary developers.

## Rijad

Primarily owns:

* backend;
* database;
* Supabase;
* authentication;
* authorization;
* application logic;
* eligibility;
* document backend;
* AI;
* integrations;
* server-side workflows.

## Lizë

Primarily owns:

* UI;
* UX;
* design system;
* visual foundations;
* applicant interface;
* municipality interface;
* evaluator interface.

This is an ownership guideline, not permission to break architecture.

Both developers must inspect the latest repository before editing.

---

# 11. Conflict Prevention

Before modifying a file, check whether it is likely being worked on by another developer.

Avoid unnecessary edits to shared files.

Especially avoid modifying Lizë's UI files when working on backend functionality.

Avoid modifying Rijad's backend files when working on UI unless integration genuinely requires it.

If a shared file must change:

1. inspect its current state;
2. preserve existing work;
3. make the smallest necessary change;
4. inspect the final diff carefully.

Never overwrite another person's work just to make your implementation easier.

Never use destructive Git commands to remove another person's changes.

---

# 12. Dependency Rules

Allowed direction:

```text
UI
 ↓
Actions
 ↓
Services
 ↓
Domain/Data
```

Do not reverse this direction.

Examples of prohibited dependencies:

```text
UI → OpenAI
UI → service-role Supabase
UI → repository/database internals
UI → Resend
```

Modules should communicate through intentional public contracts.

Prefer:

```text
import { someService } from "@/modules/example";
```

over importing internal implementation files from another module.

Use `index.ts` as a module's public API when appropriate.

Avoid circular dependencies.

---

# 13. Server Actions vs API Routes

Prefer Server Actions for normal authenticated application mutations.

Use API routes only when there is a real reason, such as:

* external webhooks;
* third-party callbacks;
* external API integration;
* streaming endpoint;
* machine-to-machine endpoint;
* a route genuinely requiring HTTP semantics.

Do not create API routes simply because an action feels like "backend code."

---

# 14. Authentication

Authentication must be verified server-side.

Never trust:

* user ID from request body;
* role from request body;
* municipality ID supplied by an untrusted client;
* client-side state;
* hidden UI elements.

Use the authenticated Supabase session to determine identity.

Authorization must happen on the server.

---

# 15. Authorization

Roles currently include:

```text
APPLICANT
MUNICIPAL_EMPLOYEE
EVALUATOR
ADMIN
```

Authorization must consider both role and resource scope.

Examples:

### Applicant

Can access only their own applicant-scoped data.

### Municipal employee

Can access only data belonging to municipalities where they have valid membership.

### Evaluator

Can access applications through explicit authorized assignments.

### Admin

Has elevated permissions only where explicitly defined by the domain.

Do not turn `ADMIN` into an excuse for bypassing all authorization logic.

---

# 16. Supabase

Supabase is the application's database/auth/storage platform.

Use:

* browser client for browser-safe operations;
* server client for authenticated server operations;
* service-role client only for trusted server-side operations where genuinely required.

The service-role key must NEVER reach the browser.

Never put service-role credentials into:

```text
NEXT_PUBLIC_*
```

Never import a service-role client into client components.

Keep RLS enabled.

Do not disable RLS as a workaround for application bugs.

---

# 17. Database Rules

Prefer structured relational data for core domain concepts.

Use JSON/JSONB only where dynamic data genuinely requires it.

Core entities should remain queryable and strongly represented.

Database changes must consider:

* foreign keys;
* constraints;
* indexes;
* uniqueness;
* nullability;
* cascading behavior;
* RLS;
* authorization boundaries.

Do not make destructive schema changes without explicit approval.

Do not silently delete existing data.

---

# 18. Row Level Security

RLS is a security boundary.

Policies should enforce appropriate ownership/scoping.

Expected boundaries include:

```text
Applicant → own data
Municipal employee → municipality-scoped data
Evaluator → assigned applications
```

When changing a table or relationship, inspect the corresponding RLS policies.

A feature is not considered secure merely because application code checks permissions.

Do not solve RLS problems by disabling RLS.

---

# 19. Validation

Validate untrusted input at system boundaries.

Use Zod or the repository's established validation mechanism for:

* forms;
* Server Action input;
* API input;
* external data;
* configuration where appropriate.

Do not trust TypeScript types as runtime validation.

TypeScript disappears at runtime.

---

# 20. TypeScript

Use strict TypeScript.

Do not use:

```typescript
any
```

unless there is an extremely specific, documented reason and no safer alternative.

Prefer:

* explicit types;
* inferred types where safe;
* discriminated unions;
* Zod-inferred types;
* generated Supabase types.

Do not duplicate types that already exist elsewhere.

---

# 21. Error Handling

Use the project's `AppError` or established error abstraction.

User-facing errors should be:

* understandable;
* safe;
* actionable where appropriate.

Technical details should remain server-side.

Never expose:

* stack traces;
* database internals;
* access tokens;
* API keys;
* service-role credentials;
* internal security information.

Log technical context server-side using the project's existing logging approach.

---

# 22. AI Safety and Reliability

AI output is untrusted data.

Treat model responses as potentially:

* incomplete;
* incorrect;
* ambiguous;
* hallucinated.

Validate structured AI output before using it.

Do not allow free-form model output to directly perform privileged actions.

For document verification:

```text
Document
 ↓
AI extraction
 ↓
Structured result
 ↓
Validation
 ↓
Deterministic comparison
 ↓
Verification result
```

Do not:

```text
Document
 ↓
LLM
 ↓
Approve applicant
```

AI confidence is not the same thing as truth.

---

# 23. External Integrations

Keep external providers behind abstractions.

Examples:

```text
AI Service
Email Service
Storage Service
```

Do not spread provider-specific SDK calls throughout the application.

This makes it possible to replace providers and keeps domain logic independent.

---

# 24. Secrets and Environment Variables

Never commit:

```text
.env
.env.local
API keys
access tokens
service-role keys
private credentials
```

Use `.env.example` for variable names only.

Clearly distinguish:

```text
NEXT_PUBLIC_*
```

from server-only secrets.

A server secret must never be imported into client code.

---

# 25. Next.js Version Rules

This project may use a Next.js version with breaking changes compared with common training data.

Before implementing Next.js-specific functionality, inspect the installed version and the relevant local documentation.

Read relevant guides under:

```text
node_modules/next/dist/docs/
```

when available.

Do not rely blindly on remembered Next.js APIs.

Pay attention to deprecation warnings.

This section is intentionally maintained because the installed Next.js version may differ from the version an AI model expects.

---

# 26. React and Client Components

Use Server Components by default where appropriate.

Add `"use client"` only when the component genuinely requires client-side behavior.

Do not turn large parts of the application into client components unnecessarily.

Keep:

* data fetching;
* authorization;
* secrets;
* server-side logic

on the server.

---

# 27. UI Boundaries

Shared UI components should remain generic.

Do not place domain business logic into:

```text
src/components/ui
```

or generic shared components.

For example, a `Button` should not know what a grant application is.

A grant-specific component belongs closer to the grants/application domain.

---

# 28. Forms

Forms should:

* validate user input;
* show useful errors;
* preserve entered data when appropriate;
* prevent accidental duplicate submissions;
* provide loading states;
* handle server errors safely.

Do not treat frontend validation as the only validation.

Server-side validation is mandatory for trusted operations.

---

# 29. Database and Mutations

For mutations:

```text
Request
 ↓
Authentication
 ↓
Authorization
 ↓
Validation
 ↓
Business rules
 ↓
Database mutation
 ↓
Audit/notification if required
```

Do not perform database mutations before authorization.

Do not trust client-provided ownership information.

---

# 30. Status Transitions

Domain statuses should have explicit valid transitions.

Do not allow arbitrary status changes such as:

```text
DRAFT → APPROVED
```

without satisfying the domain workflow.

Status transition rules should live in domain/application services rather than UI components.

---

# 31. Testing

Every meaningful feature should have tests appropriate to its risk.

Test:

* business rules;
* authorization;
* validation;
* important service behavior;
* status transitions;
* security boundaries;
* integration behavior where appropriate.

At minimum, run:

```bash
npm test
npm run lint
npm run build
```

For database/integration work, run the relevant integration tests.

Never report a test as passed if it:

* was skipped;
* was not executed;
* could not access required infrastructure.

Clearly distinguish:

```text
PASSED
FAILED
SKIPPED
BLOCKED
```

---

# 32. Definition of Done

A feature is not done merely because code was written.

Before reporting completion:

* implementation works;
* edge cases are handled;
* authorization is enforced;
* validation exists;
* tests exist where appropriate;
* tests pass;
* lint passes;
* build passes;
* no unrelated files were changed;
* no secrets were introduced;
* no existing work was overwritten;
* git diff has been reviewed.

---

# 33. Git Workflow

`main` is the permanent base branch.

Use short-lived feature branches:

```text
feat/<feature>
fix/<feature>
chore/<feature>
refactor/<feature>
```

One feature should have one primary owner.

Keep commits focused.

Prefer:

```text
feat: implement grant requirements
```

over giant mixed commits containing unrelated work.

---

# 34. Git Restrictions for AI Agents

AI agents are explicitly NOT responsible for GitHub publishing.

Agents may:

* inspect Git;
* create feature branches;
* create local commits;
* inspect diffs;
* inspect history.

Agents must NOT:

```text
git push
```

Agents must NOT:

* create GitHub PRs;
* merge PRs;
* force push;
* rewrite shared history;
* delete branches belonging to other developers.

Rijad handles GitHub pushes and PRs manually.

---

# 35. Destructive Operations

Never run destructive commands without explicit permission.

Examples include:

```text
git reset --hard
git clean -fd
database reset
dropping tables
dropping production data
destructive migrations
force push
```

If a destructive action appears necessary, stop and explain why.

---

# 36. Migration Rules

Before changing the database:

1. inspect existing migrations;
2. inspect current schema;
3. inspect RLS;
4. check relationships;
5. determine whether the requested change already exists.

Do not duplicate an existing migration.

Do not assume the remote database is empty.

If migrations were manually applied, inspect the remote state before attempting to apply them again.

Never blindly run:

```bash
supabase db push
```

against a database that may already contain manually applied migrations.

---

# 37. Documentation

Documentation must describe reality.

Do not document:

* future features as implemented;
* fake integrations;
* fake metrics;
* unsupported APIs;
* imaginary production infrastructure.

When a feature is planned but not implemented, label it clearly as planned.

When a feature is partially implemented, describe the actual current state.

---

# 38. Task Board

Use `TASKS.md` to track work.

Preferred states:

```text
BACKLOG
READY
IN PROGRESS
REVIEW
TESTING
DONE
```

A task should be moved to `DONE` only after its implementation and validation requirements are actually satisfied.

Do not mark blocked work as complete.

---

# 39. Agent Workflow

Every implementation task should follow this process:

```text
1. Inspect
      ↓
2. Understand
      ↓
3. Identify conflicts
      ↓
4. Plan
      ↓
5. Implement
      ↓
6. Test
      ↓
7. Lint
      ↓
8. Build
      ↓
9. Review git diff
      ↓
10. Report
```

Do not skip inspection.

Do not skip validation merely because the change looks small.

---

# 40. Final Agent Report

At the end of every task, report concisely:

## Implemented

What was actually implemented.

## Files changed

Important files/modules changed.

## Tests

For example:

```text
npm test — PASSED
npm run lint — PASSED
npm run build — PASSED
integration tests — SKIPPED/BLOCKED/PASSED
```

## Security

Mention relevant authorization/RLS/security validation.

## Conflicts

Confirm whether other developers' work was preserved.

## Limitations

Only real limitations or blockers.

## Next step

Recommend exactly one logical next task.

Do not silently continue into the next task.

---

# 41. No Unrequested Refactoring

Do not refactor unrelated code simply because you dislike its style.

Do not:

* rename large numbers of files;
* rewrite working modules;
* change architecture;
* replace libraries;
* redesign UI;
* reorganize the entire repository

unless the task explicitly requires it.

If you identify a useful improvement outside the current scope, mention it in the final report instead of implementing it.

---

# 42. Performance

Prefer simple, correct implementations first.

Avoid premature optimization.

However, do not introduce obvious performance problems such as:

* unnecessary database queries;
* repeated identical API calls;
* loading entire datasets when pagination is appropriate;
* expensive operations on every render;
* unbounded loops over database records.

Use pagination for potentially large collections.

---

# 43. Accessibility

UI work should follow accessible practices:

* semantic HTML;
* keyboard accessibility;
* labels for form controls;
* visible focus states;
* appropriate ARIA only when necessary;
* useful error messages;
* sufficient interaction feedback.

Do not sacrifice accessibility for visual polish.

---

# 44. Responsive Design

The application should work across:

* desktop;
* laptop;
* tablet;
* mobile.

Do not assume a desktop-only environment.

Preserve the existing design system and visual language when implementing UI.

---

# 45. Localization

The application may support multiple languages.

Do not hardcode language-specific business assumptions into domain logic.

Keep user-facing text organized according to the current project's localization approach.

Do not introduce a new i18n system without explicit need.

---

# 46. Data Privacy

Grant applications may contain sensitive personal and business information.

Follow data minimization principles.

Do not expose applicant information to:

* other applicants;
* unauthorized municipal users;
* unauthorized evaluators;
* public endpoints.

Do not include sensitive application data in logs unnecessarily.

Do not expose private documents through public storage URLs.

---

# 47. File and Document Security

Documents should eventually use private storage with authorization-aware access.

Never assume that knowing a storage path is sufficient authorization.

Document access must be checked against:

* authenticated user;
* application ownership;
* municipality membership;
* evaluator assignment;
* appropriate administrative permissions.

---

# 48. Production Mindset

Although this is a hackathon project, do not intentionally build unsafe architecture merely because the deadline is short.

Prefer:

```text
simple + real + secure
```

over:

```text
complex + impressive-looking + fake
```

The goal is a working product that can be demonstrated honestly.

---

# 49. Hackathon Priority

When time is limited:

1. working core workflow;
2. correct business logic;
3. authorization/security;
4. reliable data persistence;
5. useful AI assistance;
6. clear UX;
7. polish;
8. optional extras.

Do not spend the majority of remaining hackathon time on architecture that does not improve the working product.

---

# 50. Final Principle

When uncertain, prefer the solution that is:

* simpler;
* secure;
* testable;
* understandable;
* compatible with the existing architecture;
* genuinely functional;
* easy for the other team member to continue.

Never sacrifice correctness for the appearance of progress.

**Inspect first. Build the real thing. Test it. Protect it. Keep the architecture clean. Do not overwrite other people's work. Do not push to GitHub.**

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
