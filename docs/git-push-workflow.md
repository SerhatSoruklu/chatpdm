# Git Push Workflow

This document defines the default ChatPDM git-push behavior for future Codex sessions.

Goal:

- complete a safe, minimal push workflow
- avoid unnecessary tooling churn
- avoid unrelated cleanup during push work

## Default Rule

If the user says `push to git`, Codex should:

- review the current worktree
- validate the repo state
- fix safe validation issues before pushing
- stage the relevant ChatPDM changes
- create a clean commit with a clear commit message
- push the current branch to the configured remote

## Protected Main Contract

For this repo, treat `main` as a protected branch with the following expected
constraints:

- pull request required before merge
- no direct pushes to `main`
- signed commits required on the protected-branch path
- linear history required
- no force pushes
- no deletion path
- no assumed bypass, including admin-style bypass

Operational consequence:

- work on a feature branch
- push the feature branch to `origin`
- merge through pull request flow
- prefer squash or rebase merge over merge commits when choosing a merge style

The default meaning is:

- push the changes relevant to the current task
- do not blindly include unrelated worktree changes
- watch for merge conflicts, dirty-branch edge cases, and accidental local artifacts before pushing
- treat `push to git` as a workflow instruction, not a literal shell command

The intended workflow is:

- review
- validate
- fix safely
- stage
- commit
- push safely to the feature branch
- use pull request flow for `main`

## Scope Review

Before push:

- inspect the current worktree first
- stage only files related to the task
- do not include unrelated dirty files

## Validation Rules

For this project, keep pre-push validation lightweight and practical.

Priority order:

1. Angular build and compile health
2. TypeScript correctness
3. Basic runtime safety
4. Lint only if already configured and not noisy
5. SonarQube as advisory only

Before any push, Codex should:

- run the Angular or frontend build, or the closest equivalent compile check
- run backend TypeScript or backend compile checks when they exist and are applicable
- run a basic backend runtime-safety check when backend code changed
- ensure there are no runtime-breaking errors
- ensure there are no compile or build errors
- fix any such issues safely before continuing

Backend runtime-safety means:

- the backend compiles successfully
- the backend can start in a safe local or development validation mode
- there is no immediate crash, import failure, startup exception, or obvious route or middleware wiring failure
- required config and env validation for that mode passes

This is a lightweight startup-safety gate, not a full test pipeline.
Use the smallest reliable check that proves the backend is not obviously broken.

If startup fails, fix it safely before push.

If full startup cannot be validated because of external dependencies, state exactly:

- what was validated
- what was not validated
- why it could not be fully validated

Validation policy:

- do not run ESLint unless ESLint is already configured
- if frontend TypeScript ESLint is missing but clearly appropriate for the project, add and configure it safely, then run it
- if backend TypeScript ESLint is missing but clearly appropriate for the project, add and configure it safely, then run it
- run Markdown linting for `.md` files in the safest reasonable way
- fix lint issues safely without causing unrelated churn
- Angular or frontend lint takes precedence over backend lint if time or scope is limited
- do not stop a push for low-value stylistic warnings
- do not introduce large tooling or config churn just to satisfy lint or SonarQube
- do not make SonarQube required for push
- if SonarQube is present, reduce noise and treat it as a secondary signal

This repo is still in an early operational stage. Do not build a heavy CI/CD or validation pipeline yet. Prefer minimal, production-safe validation over process-heavy enforcement.

## Push All Rule

If the user says `push ALL`, Codex should:

- stage all intended repository changes without hesitation
- include all current repo changes unless they are clearly unsafe, secret-bearing, ignored-runtime artifacts, or obvious accidental files
- still validate first and fix safe issues before committing
- commit and push using the safest clean route available

This does not authorize pushing:

- secrets
- local-only env files
- machine-specific runtime artifacts
- accidental database dumps
- editor junk

`push ALL` means full repo worktree intent, not unsafe artifact leakage.

`push ALL` still does not authorize direct publication to protected `main`.
It means full intended scope on the current publication branch.

## Secret and Artifact Safety

Do not stage or push:

- secrets
- `.env` files
- private keys
- tokens
- credentials
- local dumps
- other sensitive artifacts
- build output
- `dist` files
- logs
- coverage output
- caches
- temp files
- editor or OS junk

Only include these if they are explicitly intended and reviewed.

## Safe Push Expectations

Before pushing, Codex should still check for:

- merge conflict risk
- remote divergence that needs a safe merge or rebase decision
- accidentally modified deployment files outside task scope
- untracked files that should stay local
- secrets
- local-only artifacts
- failed validation

If the repo state is clearly unsafe, Codex should stop and explain the blocker briefly.

Do not auto-merge or auto-rebase in ambiguous situations.

## Commit Message Expectations

Commit messages should be:

- short
- specific
- task-shaped
- readable on GitHub

Avoid vague commit messages like:

- `update`
- `fix stuff`
- `changes`

Never force-push unless the user explicitly instructs it.

## Blocking Issues

Block push on:

- compile or build failures
- backend startup-safety failure
- merge conflicts
- remote divergence needing judgment
- secrets or sensitive files
- unrelated dirty changes that should be excluded

## Non-Blocking By Default

Do not block push by default for:

- low-value warnings
- minor style issues
- SonarQube noise
- optional Markdown or style polish

## Deployment Follow-Up

After a successful push:

- the user may check deploy logs
- Codex should help verify deploy behavior, health checks, and rollback signals if needed

If the user asks for `push` plus `deploy`, adapt to the protected-branch model:

- push the feature branch
- prepare or open the pull request when requested
- validate the branch and any deploy-facing checks
- do not bypass branch protection in order to deploy through `main`

If deployment is triggered only from merged `main`, the deploy path now depends
on pull request merge, not direct push.

This workflow is meant to reduce staging friction while keeping pushes deliberate and safe.
