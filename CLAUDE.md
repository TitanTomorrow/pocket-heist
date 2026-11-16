# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Pocket Heist is a starter project for the Claude Code Masterclass: a Next.js 16 (App Router, React 19) app for planning small "office mischief" missions. There is no backend, auth, or data layer yet. The login and signup forms are client-side only and just `console.log` what was submitted; the heist pages are still stubs.

## Commands

- `npm run dev`: dev server at http://localhost:3000
- `npm run build`: production build
- `npm run lint`: ESLint (flat config in `eslint.config.mjs`)
- `npm test`: Vitest in watch mode; `npx vitest run` for a single pass
- Single test file: `npx vitest run tests/components/AuthForm.test.tsx`; single test by name: add `-t "<test name>"`
- **Run tests from PowerShell, not Git Bash.** Under Git Bash the `@/` path alias fails to resolve, so every test file fails to load, which looks like a real failure.

## Architecture

- **Route groups split the app into two shells:**
  - `app/(public)/`: logged-out pages (splash `/`, `/login`, `/signup`, `/preview`). Its layout wraps pages in `<main className="public">` with no navbar.
  - `app/(dashboard)/`: logged-in pages under `/heists` (list, `create`, `[id]` detail). Its layout renders `<Navbar />` above `<main>`.
- **Intended routing:** the `/` splash page is meant to redirect logged-in users to `/heists` and everyone else to `/login` (see the comment at the top of `app/(public)/page.tsx`). That redirect is not implemented yet.
- **`/preview`** is a component showcase. When adding a component, add a labelled section for it to `app/(public)/preview/page.tsx` (layout helpers: `.preview-grid`, `.preview-row`).
- **Components** live in `components/<Name>/` with `<Name>.tsx`, a co-located `<Name>.module.css`, and an `index.ts` that re-exports the default (`export { default } from "./<Name>"`). Import them as `@/components/<Name>`. `AuthForm` is one shared component driven by a `mode: "login" | "signup"` prop rather than two separate forms.
- **Styling** uses Tailwind v4, configured CSS-first: there is no `tailwind.config`, and theme colours/fonts are defined in the `@theme` block in `app/globals.css` (e.g. `text-primary`, `bg-dark`, `text-body`, `text-error`). Shared classes (`.page-content`, `.center-content`, `.form-title`, `.btn`) also live there. Component-specific styles go in CSS modules, which must start with `@reference "../../app/globals.css";` so `@apply` can use the theme tokens.
- **Branding:** the logo is the text "P🕗cket Heist", with lucide-react's `Clock8` icon standing in for the "o". Icons come from `lucide-react`.

## Testing

Tests live in `tests/` (mirroring the source path, e.g. `tests/components/`), not next to source files. Vitest runs in jsdom with globals enabled, and `vitest.setup.ts` loads the jest-dom matchers. The `@/` path alias works in tests via `vite-tsconfig-paths`. Use React Testing Library (plus `@testing-library/user-event` for interactions) and query by role or label.

## Feature workflow

The project custom slash commands in `.claude/commands/` define the expected workflow:

- `/spec <idea>`: creates a branch `claude/feature/<slug>` from a clean `main` and writes `_specs/<slug>.md` from `_specs/template.md`. Implementation plans for a spec go in `_plans/<slug>.md`.
- `/component <description>`: builds a component test-first (failing test, then component, then passing test, then add it to `/preview`).
- `/commit-message`: proposes a commit message as `<emoji> <type>: <description>` using only ✨ feat, 🐛 fix, 🔨 refactor, 📝 docs, 🎨 style, ✅ test, ⚡ perf. Present tense, explain why. Never commit without the user's approval.

## Additional Preferences

- Do NOT use semicolons for JavaScript or TypeScript code.
- Do NOT apply tailwind classes directly in component templates unless essential or just 1 at the most. If an element needs more than a single tailwind class, combine them into a custom class using the '@apply' directive
- Use minimal project dependencies where possible.
- Use the 'git switch -c' command to switch to new branches, no 'git checkout'

## Check Documentation

- Before writing code that uses a library or framework API (Next.js 16, React 19, Tailwind v4, Vitest), look up the current docs with the Context7 MCP server rather than relying on memory. These versions are newer than most training data.
