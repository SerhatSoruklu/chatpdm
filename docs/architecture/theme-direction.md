# ChatPDM Theme Direction

## Current State

ChatPDM ships with a light theme by default.

That is intentional.

## Document Role

- Role: visual direction note.
- Scope: public-page tone, palette, and structural theme guidance.
- Does not govern: runtime law, roadmap sequencing, or evidence artifacts.
- Related docs: [document-authority-index.md](../meta/document-authority-index.md), [../../README.md](../../README.md), [../../PRODUCT-IDENTITY.md](../../PRODUCT-IDENTITY.md).
- Precedence: design context only; control docs override this file.

The current landing shell should feel:

- calm
- bright
- precise
- product-grade
- web-first, not assistant-like

## Theme Structure

ChatPDM does not use CSS variables or a `:root` token system.

Instead, theme structure should remain explicit through scoped selectors such as:

- `html[data-pdm-theme='light'] body`
- `html[data-pdm-theme='dark'] body`

This keeps the CSS readable and avoids hiding visual rules inside a token layer.

Current state:

- light mode is the active baseline
- dark mode is documented and structurally possible
- dark visuals are intentionally deferred

## Rules

- Use only ChatPDM theme conventions and approved design primitives.
- Do not use generic utility naming as the main styling model.
- Keep component class names unique to ChatPDM.
- Prefer explicit component rules over token indirection.

## Public Page Baseline

The homepage visual system is now the baseline for future public pages.

That means:

- one continuous soft background atmosphere
- one calm product card system
- one consistent spacing rhythm
- one restrained serif role limited to hero or rare title moments
- one product-grade UI/body typography role that dominates the interface
- one support/technical mono role for labels, microdata, and API accents

Future public pages such as docs, concepts, compare, FAQ, developers, and API surfaces should inherit that same direction.

Do not drift into:

- editorial styling
- assistant branding
- chatbot theatrics
- per-page visual experimentation
- random new card systems or spacing rules

## Future Dark Theme Work

Dark mode is deferred until the product moves beyond the coming-soon shell.

When added later:

- preserve the same spacing, typography, and layout structure
- invert contrast carefully
- keep the calm product feel
- avoid turning the brand into a generic dark AI dashboard
