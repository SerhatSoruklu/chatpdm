# Contributing

ChatPDM uses a protected-branch workflow on `main`.

## Community Standards

- Follow [Code of Conduct](./CODE_OF_CONDUCT.md).
- Use the issue templates in [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/).

## Markdown Hygiene

Repository Markdown is checked with `npm run lint:md` via `markdownlint-cli2`.
That includes the root docs tree, the `backend/`, `data/`, `docs/`, `frontend/`, `tests/`, and `security/` Markdown surfaces.

When editing `.md` files:

- keep one blank line around headings and tables
- avoid duplicate sibling headings
- prefer explicit fenced code block languages
- keep list indentation consistent
- avoid trailing spaces
- keep heading levels in order unless a document structure explicitly requires a skip

## Git publish policy

- Do not push directly to `main`.
- Create or use a feature branch before publishing work to `origin`.
- If work started on `main`, create a feature branch before pushing.
- Use a pull request for merge-ready publication.
- Do not force-push unless explicitly requested and branch protection allows it.
- Prefer linear-history-compatible workflows.
