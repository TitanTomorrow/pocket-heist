# Plan: Authentication Forms for Login and Signup

Spec: `_specs/auth-forms.md` · Branch: `claude/feature/auth-forms` (already checked out)

## Context
`/login` and `/signup` currently show only a heading. The spec adds one shared form component, used in two modes, with email/password fields, a show/hide password toggle, signup-only "confirm password" + validation, and a link to the other page. There is no backend, so a valid submit only logs `{ mode, email, password }` to the console.

## Approach
Build one client component, `AuthForm`, test-first (following `.claude/commands/component.md`), then drop it into both pages and the preview page.

### 1. Tests first: `tests/components/AuthForm.test.tsx`
Use `@testing-library/user-event` (already installed) and `vi.spyOn(console, "log")`. Query by role/label. Cases (from the spec):
- Login mode: Email + Password fields, "Log in" button, link to `/signup`, no confirm field
- Signup mode: Confirm password field, "Sign up" button, link to `/login`
- Toggle: password masked by default; click → `type="text"` and label changes to "Hide password"; click again → hidden. In signup mode it affects both password fields
- Clicking the toggle does not log
- Valid login submit logs `{ mode: "login", email: "name@example.com", password }` from input `"  Name@Example.COM "`
- Signup password under 6 chars → error shown, no log
- Valid signup submit → logs, then all fields empty

Run `npx vitest run tests/components/AuthForm.test.tsx` from **PowerShell** (the `@/` alias fails under Git Bash) and confirm the tests fail.

### 2. Component: `components/AuthForm/`
- `AuthForm.tsx`: `"use client"`, prop `mode: "login" | "signup"`, no semicolons.
  - State: `email`, `password`, `confirmPassword`, `showPassword`, `error`.
  - Inputs: `type="email"` + `required`; password(s) `type={showPassword ? "text" : "password"}` + `required`. Autocomplete: `email`, `current-password` (login) and `new-password` (both signup fields). Labels "Email", "Password", "Confirm password" linked through `htmlFor`/`id`.
  - Toggle: `<button type="button">` with Lucide `Eye` / `EyeOff`, `aria-label` "Show password" / "Hide password", placed beside the password input in a relatively positioned wrapper.
  - Submit handler: `preventDefault`. In signup mode, check length < 6 → set error ("Password must be at least 6 characters"), then mismatch → set error ("Passwords do not match"), and return. Otherwise log `{ mode, email: email.trim().toLowerCase(), password }`. After a valid signup, reset all fields, `showPassword` and `error`.
  - Editing either password field clears `error`.
  - Error rendered as `<p role="alert">` below the confirm field (signup only).
  - Footer: the prompt text plus a `next/link` `Link` to the other route.
- `AuthForm.module.css`: starts with `@reference "../../app/globals.css";`. Classes `.form`, `.field`, `.label`, `.input`, `.passwordWrap`, `.toggle`, `.error`, `.switch` built with `@apply`, using theme tokens (`bg-lighter`, `text-heading`, `text-error`, `text-primary`). The form is `w-full max-w-sm mx-auto`. The submit button reuses the global `.btn` class (one class, so it's allowed on the template).
- `index.ts`: `export { default } from "./AuthForm"`

Run the tests again and iterate until they pass.

### 3. Wire into pages
- `app/(public)/login/page.tsx`: render `<AuthForm mode="login" />` under the `h1`.
- `app/(public)/signup/page.tsx`: render `<AuthForm mode="signup" />` under the heading. (Leave the heading level as is.)
- `app/(public)/preview/page.tsx`: add an "AuthForm" section showing both modes.

Moving between pages remounts the component, so the toggle resets to hidden with no extra code.

## Note on mobile width
`.page-content` in `app/globals.css` has `min-w-2xl` (42rem), which forces horizontal scroll on phones for every page that uses it. The form itself will be fluid. Meeting the spec's "no horizontal scroll" fully needs that `min-w-2xl` removed. I'll make that one-line change unless you'd rather keep it out of this branch.

## Verification
1. `npx vitest run` (PowerShell): all suites pass, including the existing Avatar/Navbar/Skeleton.
2. `npm run lint` is clean and `npm run build` succeeds.
3. `npm run dev`, then check by hand:
   - On `/login`, submit and see the console log; the link goes to `/signup`.
   - On `/signup`, a mismatch shows the error, a 5-character password is rejected, and a valid submit logs then clears.
   - The toggle switches both fields.
   - It looks right at ~375px wide.
