# ChatPDM SEO Policy

This document defines the durable SEO rules for ChatPDM public routes.

## Ownership

- SEO is registry-driven.
- Routes point to SEO keys.
- The registry owns titles, descriptions, canonicals, robots, and sitemap intent.
- Components do not own routine SEO metadata by default.

## Route Naming

- Use clean router paths only.
- Use English-only public route names.
- Do not use hash URLs for page identity.
- Canonical paths must start with `/`.
- Canonical paths must never contain `#`.

Current public route set:

- `/`
- `/about`
- `/how-it-works`
- `/faq`
- `/contact`
- `/privacy`
- `/terms`
- `/cookies`
- `/docs`
- `/developers`
- `/handbooks`
- `/api`

## Title Rules

- Maximum length: 60 characters
- Delimiter: ` - ` only
- `|` is not allowed
- Titles must be deliberate and consistent across route families
- Avoid one-word titles unless the route genuinely justifies it
- Avoid bloated titles that try to pack every keyword into one line

Examples:

- `ChatPDM - Deterministic Meaning System`
- `About ChatPDM - Deterministic Meaning System`
- `How ChatPDM Works - Deterministic Answer Model`
- `Developer Overview - ChatPDM`
- `API Reference - ChatPDM`

## Description Rules

- Maximum length: 160 characters
- Keep descriptions concise, factual, and readable
- Avoid filler and repeated phrasing across unrelated routes
- Describe the actual route surface, not imagined future scope

## Canonical Rules

- Every public route should have one clean canonical path
- Do not emit hash-based canonical URLs
- Do not create alternate title or URL styles for the same public page without a real routing reason

## Registry Structure

SEO families remain split by route family:

- static
- legal
- faq
- docs
- developer
- handbooks
- api-reference
- concepts
- compare
- not-found

This structure should expand by family, not collapse into one large SEO file.

## Placeholder Page Rules

- Placeholder pages must still have clean titles and descriptions
- Placeholder pages may remain out of the sitemap until their content is publication-ready
- Placeholder pages should stay concise and credible, not padded with fake marketing sections

## Agent Expectations

- Keep SEO config-driven
- Do not scatter metadata into random components
- Keep route naming explicit and English-only
- Preserve SSR-friendly canonical behavior
- Extend the split registry instead of creating a monolithic SEO file
