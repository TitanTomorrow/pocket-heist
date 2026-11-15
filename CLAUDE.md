# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Pocket Heist is a starter project for the Claude Code Masterclass: a Next.js (App Router) app for planning small "office mischief" missions. Most pages are still stubs; there is no backend, auth, or data layer yet.

## Commands

- `npm run dev`: dev server at http://localhost:3000
- `npm run build`: production build
- `npm run lint`: ESLint (flat config in `eslint.config.mjs`)
- `npm test`: Vitest in watch mode; `npx vitest run` for a single pass
- Single test file: `npx vitest run tests/components/Navbar.test.tsx`; single test by name: add `-t "renders the main heading"`

## Architecture

- **Route groups split the app into two shells:**
  - `app/(public)/`: logged-out pages (splash `/`, `/login`, `/signup`, `/preview`). Its layout wraps pages in `<main className="public">` with no navbar.
  - `app/(dashboard)/`: logged-in pages under `/heists` (list, `create`, `[id]` detail). Its layout renders `<Navbar />` above `<main>`.
- **Intended routing:** the `/` splash page is meant to redirect logged-in users to `/heists` and everyone else to `/login` (see the comment at the top of `app/(public)/page.tsx`). That redirect is not implemented yet.
- **Components** live in `components/<Name>/` with `<Name>.tsx`, a co-located `<Name>.module.css`, and an `index.ts` that re-exports the default. Import them as `@/components/<Name>`.
- **Styling** uses Tailwind v4, configured CSS-first: there is no `tailwind.config`, and theme colours/fonts are defined in the `@theme` block in `app/globals.css` (e.g. `text-primary`, `bg-dark`, `text-body`). Shared layout classes (`.page-content`, `.center-content`, `.form-title`) also live there. Component-specific styles go in CSS modules.
- **Branding:** the logo is the text "P🕗cket Heist", with lucide-react's `Clock8` icon standing in for the "o".

## Testing

Tests live in `tests/` (mirroring the source path, e.g. `tests/components/`), not next to source files. Vitest runs in jsdom with globals enabled, and `vitest.setup.ts` loads the jest-dom matchers. The `@/` path alias works in tests via `vite-tsconfig-paths`. Use React Testing Library and query by role.

## Additional Preferences

- Do NOT use semicolons for JavaScript or TypeScript code.
- Do NOT apply tailwind classes directly in component templates unless essential or just 1 at the most. If an element needs more than a single tailwind class, combine them into a custom class using the '@apply' directive
- Use minimal project dependencies where possible.
- Use the 'git switch -c' command to switch to new branches, no 'git checkout'