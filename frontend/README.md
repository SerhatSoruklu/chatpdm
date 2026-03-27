# ChatPDM Frontend

Angular shell for the ChatPDM landing experience.

## Scope

Current responsibilities:

- render the coming-soon landing page
- keep the visual baseline aligned with `src/app/pages/landing`
- establish a ChatPDM-specific responsive shell and theme-ready structure

## Design Rules

- This frontend is not 4Kapi.
- Do not reuse 4Kapi CSS patterns, utilities, or class naming.
- Use ChatPDM-specific semantic class names.
- Do not use CSS variables or `:root` token systems.
- Light theme is active by default.
- Dark theme is planned later and should remain easy to add.

## Responsive Rules

The official layout system is documented in:

- `../docs/architecture/responsive-layout.md`

Use only the documented breakpoint bands and container rules.

## Run

```bash
npm install
npm start
```

## Build

```bash
npm run build
```
