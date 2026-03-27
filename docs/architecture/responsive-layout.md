# ChatPDM Responsive Layout System

This document defines the official responsive layout system for ChatPDM.

It is web-first, but it is intentionally structured so future iPhone/iOS and Android surfaces can map to the same content hierarchy and spacing logic.

## Official Breakpoint Bands

These are the only approved breakpoint bands for ChatPDM unless this document is explicitly updated.

| Band | Range | Intent |
| --- | --- | --- |
| mobile | `0-599px` | single-column, touch-first, compact vertical rhythm |
| tablet | `600-839px` | wider single-column reading layout, inline actions allowed |
| mini laptop | `840-1199px` | desktop web shell begins, stronger spacing and panel sizing |
| medium desktop | `1200-1439px` | primary desktop target, comfortable reading width |
| large desktop | `1440px+` | premium wide-canvas treatment without excessive line length |

In CSS, this maps to:

- base styles: mobile
- `@media (min-width: 600px)`: tablet
- `@media (min-width: 840px)`: mini laptop
- `@media (min-width: 1200px)`: medium desktop
- `@media (min-width: 1440px)`: large desktop

## Container System

ChatPDM uses a small shell/container structure:

- `.pdm-shell`
- `.pdm-shell--hero`
- `.pdm-shell__frame`

### `.pdm-shell`

Structural outer wrapper for the current page band.

Use it for:

- full-height page sections
- centered hero surfaces
- future answer/result surfaces

### `.pdm-shell__frame`

Official content container for page-level width control.

Container behavior by band:

| Band | Container behavior |
| --- | --- |
| mobile | full width with `18px` side padding via the shell |
| tablet | max width `44rem`, shell padding `28px` |
| mini laptop | max width `58rem`, shell padding `32px` |
| medium desktop | max width `70rem`, shell padding `40px` |
| large desktop | max width `78rem`, shell padding `48px` |

This keeps the outer structure stable while allowing inner cards or answer surfaces to size themselves appropriately.

## Landing Shell Rules

The current coming-soon shell uses the global container system plus a landing-specific panel.

### Card sizing

Landing panel behavior:

| Band | Card behavior |
| --- | --- |
| mobile | full width inside frame |
| tablet | max width `40rem` |
| mini laptop | max width `46rem` |
| medium desktop | max width `50rem` |
| large desktop | max width `54rem` |

### Typography

Typography should scale by band, not randomly per component.

Landing rules:

| Band | Brand | Headline | Body copy |
| --- | --- | --- | --- |
| mobile | `3.25rem` | `2rem` | `0.96rem` |
| tablet | `4.5rem` | `2.45rem` | `1rem` |
| mini laptop | `5.25rem` | `2.85rem` | `1.05rem` |
| medium desktop | `5.7rem` | `3.1rem` | `1.0625rem` |
| large desktop | `6rem` | `3.25rem` | `1.125rem` |

### Spacing rhythm

Hero spacing should scale by band:

| Band | Hero padding |
| --- | --- |
| mobile | `32px 18px 56px` |
| tablet | `44px 28px 72px` |
| mini laptop | `56px 32px 88px` |
| medium desktop | `64px 40px 96px` |
| large desktop | `72px 48px 104px` |

### Inputs and buttons

Interaction pattern:

| Band | Input/button behavior |
| --- | --- |
| mobile | stacked vertically, full width |
| tablet+ | inline row, shared bar, button remains fixed-width |

This rule is important for future native adaptation: mobile keeps clear tap targets and vertical grouping.

### Readable line length

Body copy should not expand indefinitely.

Current rule:

- lead paragraph: cap around `30rem` to `39rem` depending on band
- supporting note: cap around `30rem` to `36rem`

This matters more than raw container width because future answer surfaces will need the same reading discipline.

## Future Mobile and Native Adaptation Notes

The web UI is not trying to imitate a phone app.

The goal is structural compatibility:

- single-column reading flow on small screens
- predictable vertical stacking of interaction groups
- stable content grouping for future native cards
- touch-safe input and button zones
- readable line lengths that do not assume wide desktop canvases

When future iOS or Android work begins, the native implementation should inherit:

- the same content order
- the same breakpoint intent translated into native size classes
- the same grouping between heading, lead, signal chips, action bar, and supporting note

## Agent Rules

Future coding agents should follow these rules:

- do not add one-off breakpoints like `768`, `992`, `1025`, or `1365` without updating this document
- do not hardcode wide desktop assumptions into answer cards
- do not let line length expand just because viewport width increases
- prefer container updates over scattered component-level width hacks
- keep mobile layout single-column unless there is a strong product reason to split it

## Deferred

Not part of this task:

- native mobile UI implementation
- dark mode implementation
- multi-column answer/result surfaces
- additional pages or product features
