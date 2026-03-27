# ChatPDM Frontend

Angular SSR query surface for the ChatPDM runtime.

## Scope

Current responsibilities:

- render the live ChatPDM query surface
- keep the visual baseline aligned with `src/app/pages/landing`
- preserve Angular SSR-safe runtime behavior
- establish a ChatPDM-specific responsive shell and theme-ready structure
- apply SEO through a config-driven registry rather than component-level meta ownership

## SEO Architecture

ChatPDM SEO is route-driven and registry-backed.

- routes carry SEO keys
- `src/app/seo/seo.service.ts` applies title, description, canonical, robots, Open Graph, Twitter, and structured data
- `src/app/seo/seo.registry.ts` aggregates split SEO families into one registry
- `src/app/seo/registry/` keeps SEO definitions separated by public route family
- `scripts/generate-sitemap.ts` writes `public/sitemap.xml` and `public/robots.txt` from the same SEO source

Current families are defined for:

- static pages
- legal pages
- FAQ
- docs
- developers
- handbooks
- API reference
- concepts
- compare
- not-found

Some families intentionally begin as placeholders so growth stays structured instead of collapsing into one SEO mega-file.

## Design Rules

- This frontend is not 4Kapi.
- Do not reuse 4Kapi CSS patterns, utilities, or class naming.
- Use ChatPDM-specific semantic class names.
- Do not use CSS variables or `:root` token systems.
- Light theme is active by default.
- Dark theme is planned later and should remain easy to add.

## Component File Rules

Default component structure:

- `component.ts`
- `component.html`
- `component.css`

Use component-local CSS by default. Keep component-specific rules next to the component that owns them.

Use global [styles.css](/home/serhat/code/chatpdm/frontend/src/styles.css) only for:

- reset and base document rules
- shared typography foundations
- shared spacing/layout foundations
- intentionally approved global primitives

Do not move page or component styling into the global stylesheet just for convenience.

## Spec Rules

`spec.ts` files are optional for purely presentational leaf components.

They are expected when a component includes:

- interaction logic
- derived or computed state
- SSR-sensitive behavior
- route-aware behavior
- render conditions that would be easy to regress

## Responsive Rules

The official layout system is documented in:

- `../docs/architecture/responsive-layout.md`

Use only the documented breakpoint bands and container rules.

## Run

```bash
npm install
npm start
```

SSR server output can be run with:

```bash
npm run serve:ssr:frontend
```

Production build output:

```text
dist/frontend/browser
dist/frontend/server
```

## Build

```bash
npm run build
```
