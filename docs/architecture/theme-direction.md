# ChatPDM Theme Direction

## Current State

ChatPDM ships with a light theme by default.

That is intentional.

The current landing shell should feel:

- calm
- bright
- precise
- editorial
- product-like, not chat-like

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

- Do not import 4Kapi tokens or theme conventions.
- Do not use generic utility naming as the main styling model.
- Keep component class names unique to ChatPDM.
- Prefer explicit component rules over token indirection.

## Future Dark Theme Work

Dark mode is deferred until the product moves beyond the coming-soon shell.

When added later:

- preserve the same spacing, typography, and layout structure
- invert contrast carefully
- keep the calm editorial feel
- avoid turning the brand into a generic dark AI dashboard
