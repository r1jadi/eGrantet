# Task Board

This file is the working source of truth for development tasks.

Tasks must be small enough to implement, test, review, and complete independently.

Do not treat this file as a roadmap for an agent to implement everything at once.

---

# Development Workflow

Every task follows this lifecycle:

- [ ] supabase: Project validation and database types — owner: Rijad — branch: feat/supabase-validation

Every implementation follows:

```text
Inspect
  ↓
Understand
  ↓
Plan
  ↓
Implement
  ↓
Test
  ↓
Lint
  ↓
Build
  ↓
Review diff
  ↓
Report
```

- [ ] backend: Core grant management backend — owner: Rijad — branch: feat/core-backend-grants — local tests, lint, and build passed; awaiting Supabase migration verification
- [ ] auth: Supabase Auth & Authorization — owner: Rijad — branch: feat/auth-authorization — local validation passed; awaiting authenticated Supabase integration checks

Moving into unrelated functionality without a new assigned task is out of scope.

---

# Task Rules

Every task must:

* have one clear outcome;
* have one primary owner;
* use a short-lived feature branch;
* be small enough to review;
* define what is included;
* avoid unrelated functionality;
* be tested before completion;
* pass lint/build where applicable;
* be moved through the board honestly.

Do not mark a task `DONE` if it is only partially implemented.

Do not move blocked work to `DONE`.

If a task reveals that another task is required, create or update a separate task rather than silently expanding the current task.

---

# Ownership

## Rijad

Primary ownership:

* backend;
* database;
* Supabase;
* authentication;
* authorization;
* business logic;
* grants backend;
* applications backend;
* eligibility;
* documents;
* AI;
* integrations;
* notifications;
* audit;
* server-side workflows.

## Lizë

Primary ownership:

* UI;
* UX;
* design system;
* applicant interface;
* municipality interface;
* evaluator interface;
* responsive layouts;
* visual polish.

Both developers must inspect the latest repository before modifying shared files.

---

# Branch Rules

Use short-lived feature branches:

```text
feat/<feature>
fix/<feature>
chore/<feature>
refactor/<feature>
```

One primary owner per feature.

Do not create permanent:

```text
develop
development
testing
rijad
lize
```

branches.

AI agents may create local commits.

AI agents must NOT:

* `git push`;
* create GitHub PRs;
* merge PRs;
* force push;
* rewrite shared history.

Rijad handles GitHub publishing manually.

---

# BACKLOG

Future work that has been identified but is not yet approved/ready for implementation.

## Product

* [ ] backend: Grant management — owner: Rijad — branch: feat/grant-management
* [ ] backend: Grant discovery backend — owner: Rijad — branch: feat/grant-discovery
* [ ] backend: Application core — owner: Rijad — branch: feat/application-core
* [ ] backend: Application submission workflow — owner: Rijad — branch: feat/application-submission
* [ ] backend: Document storage — owner: Rijad — branch: feat/document-storage
* [ ] backend: Deterministic eligibility engine — owner: Rijad — branch: feat/eligibility-engine
* [ ] backend: AI document verification — owner: Rijad — branch: feat/ai-document-verification
* [ ] backend: Municipality application review — owner: Rijad — branch: feat/municipality-review
* [ ] backend: Evaluator assignment and scoring — owner: Rijad — branch: feat/evaluator-system
* [ ] backend: Notifications and email workflow — owner: Rijad — branch: feat/notifications
* [ ] backend: Audit logging — owner: Rijad — branch: feat/audit-logging
* [ ] backend: Analytics and reporting — owner: Rijad — branch: feat/reporting

## UI

* [ ] ui: Applicant grant discovery — owner: Lizë — branch: feat/applicant-grant-discovery
* [ ] ui: Grant details and requirements — owner: Lizë — branch: feat/grant-details
* [ ] ui: Application wizard — owner: Lizë — branch: feat/application-wizard
* [ ] ui: Applicant application dashboard — owner: Lizë — branch: feat/applicant-dashboard
* [ ] ui: Document upload interface — owner: Lizë — branch: feat/document-upload-ui
* [ ] ui: Eligibility results interface — owner: Lizë — branch: feat/eligibility-ui
* [ ] ui: Municipality dashboard — owner: Lizë — branch: feat/municipality-dashboard
* [ ] ui: Municipality review interface — owner: Lizë — branch: feat/municipality-review-ui
* [ ] ui: Evaluator workspace — owner: Lizë — branch: feat/evaluator-workspace
* [ ] ui: Notifications interface — owner: Lizë — branch: feat/notifications-ui
* [ ] ui: Reporting interface — owner: Lizë — branch: feat/reporting-ui

---

# READY

Approved and unblocked tasks that can be started.

## Current Day 2

### Rijad

* [ ] backend: Supabase Auth & Authorization — owner: Rijad — branch: feat/auth-authorization

### Lizë

Move a UI task here only after the required backend contract/data shape is clear enough for implementation.

---

# IN PROGRESS

Only tasks currently being actively implemented.

*None.*

---

# REVIEW

Tasks completed by the owner and awaiting review/validation.

* [ ] backend: Core grant management backend — owner: Rijad — branch: feat/core-backend-grants — local tests, lint, and build passed; awaiting Supabase migration verification

---

# TESTING

Tasks that require integration, acceptance, or end-to-end validation.

*None.*

---

# DONE

Completed and verified tasks.

* [x] foundation: Database & Domain Foundation — owner: Rijad — branch: feat/database-domain-foundation — verified locally

* [x] foundation: UI Foundation — owner: Lizë — branch: feat/ui-foundation — verified locally

* [x] foundation: Repository Architecture — owner: Rijad — branch: main — architecture, testing, and build foundation established

---

# Current Product Build Order

The backend should generally progress through these dependencies:

```text
1. Auth & Authorization
        ↓
2. Grant Management
        ↓
3. Grant Discovery
        ↓
4. Application Core
        ↓
5. Application Submission
        ↓
6. Document Storage
        ↓
7. Eligibility Engine
        ↓
8. AI Document Verification
        ↓
9. Municipality Review
        ↓
10. Evaluator System
        ↓
11. Notifications & Audit
        ↓
12. Reporting
```

This is a dependency order, not permission for an agent to implement multiple stages in one task.

Each stage must be split into focused implementation tasks when work begins.

---

# Backend / Frontend Coordination

Backend and UI work should be coordinated through stable contracts.

Preferred pattern:

```text
Rijad backend
     ↓
Domain/API contract
     ↓
Lizë UI
```

Avoid having both developers independently invent different:

* database shapes;
* status values;
* role names;
* API payloads;
* validation rules;
* field names.

Before UI implementation depends on a backend feature, inspect the actual backend implementation.

Before backend implementation changes an existing UI contract, inspect the current UI usage.

---

# Task Completion Requirements

A task may move to `DONE` only when:

* the assigned functionality is implemented;
* existing functionality still works;
* relevant tests pass;
* lint passes;
* build passes;
* security/authorization has been checked where relevant;
* no unrelated work was included;
* the git diff has been reviewed;
* the owner has reported any limitations;
* the task is actually ready to be considered complete.

For tasks requiring external infrastructure, distinguish:

```text
PASSED
FAILED
SKIPPED
BLOCKED
```

Do not describe skipped or blocked validation as passed.

---

# Task Format

Use:

```text
- [ ] <domain>: concise outcome — owner: <name> — branch: feat/<name>
```

Examples:

```text
- [ ] backend: Grant requirements CRUD — owner: Rijad — branch: feat/grant-requirements
- [ ] ui: Grant requirements form — owner: Lizë — branch: feat/grant-requirements-ui
```

For completed work:

```text
- [x] backend: Grant requirements CRUD — owner: Rijad — branch: feat/grant-requirements — verified
```

Keep task names outcome-oriented.

Prefer:

```text
Grant requirements CRUD
```

over:

```text
Work on grants
```

---

# Task Splitting Rule

If a task becomes too large, split it.

For example:

```text
Grant Management
```

should not automatically become one giant implementation.

It can be split into:

```text
Grant CRUD
Grant lifecycle
Grant requirements
Grant publishing
Grant access control
```

Each part should produce a real, testable outcome.

Do not create dozens of micro-tasks for trivial changes.

The goal is focused implementation with meaningful progress.

---

# Definition of Done

A task is complete when it is:

```text
Functional
+
Tested
+
Validated
+
Secure
+
Integrated with the current architecture
+
Safe for the next task to build on
```

The task board must reflect the actual state of the repository, not the intended state.


---

## Documentation map

- `README.md` - project overview, stack, setup, environment variables, and current status (implemented / in progress / planned).
- `ARCHITECTURE.md` - architecture source of truth: module boundaries, dependency direction, database strategy, RLS, validation, errors, logging, testing strategy.
- `AGENTS.md` - rules and workflow for AI coding agents (ownership, git rules, testing gate).

## Documentation rules

- Documentation must describe the repository as it actually is; never document planned functionality as implemented.
- Keep the README current status section, `ARCHITECTURE.md`, and this board consistent with each other.
- Documented commands and folders must exist; remove outdated instructions only when they are demonstrably obsolete.
