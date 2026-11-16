# Spec for Authentication Forms for Login and Signup

branch: claude/feature/auth-forms

## Summary
Add working authentication forms to the `/login` and `/signup` pages. Each form collects an email address and a password, includes an icon button to show or hide the password, and has a submit button labelled for its purpose ("Log in" or "Sign up"). The signup form also asks the user to confirm their password. There is no backend or auth layer yet, so submitting a form only logs the entered details to the browser console. Each form includes a clear link to the other page so users can easily switch between logging in and signing up.

## Functional Requirements
- The login page (`/login`) displays an authentication form beneath its existing heading.
- The signup page (`/signup`) displays an authentication form beneath its existing heading.
- Both forms share a single reusable form component, configured by mode (login or signup), so the two stay visually and behaviourally consistent.
- Each form contains:
  - An email field with a visible label, using the email input type.
  - A password field with a visible label, masked by default.
  - Signup only: a "Confirm password" field with a visible label, masked by default.
  - A toggle icon button inside or beside the password field that switches the password between hidden and visible.
  - A submit button whose text reflects the mode: "Log in" on the login page, "Sign up" on the signup page.
- The password visibility toggle:
  - Uses lucide-react icons (e.g. an eye icon when the password is hidden, an eye-off icon when visible).
  - Has an accessible label that describes its current action (e.g. "Show password" / "Hide password").
  - In signup mode, a single toggle controls both the password and confirm password fields together.
  - Does not submit the form when clicked.
  - Does not clear or alter the typed values.
- Validation:
  - All fields are required; the browser's native validation prevents submission when any field is empty or the email is malformed.
  - Signup only: the password must be at least 6 characters.
  - Signup only: the password and confirm password must match. If they do not, submission is blocked and an inline error message is shown near the confirm field. The error clears once the user edits either password field.
- On submit:
  - The default page reload is prevented.
  - The form logs the mode, the email (trimmed and lowercased), and the password to the console. The confirm password value is not logged.
  - Trimming and lowercasing apply to the logged value only; the text in the email field is not changed.
  - No network requests, navigation, or storage occur.
- After a valid signup submit:
  - All signup fields are cleared.
  - The password visibility toggle resets to hidden.
  - Any validation error is cleared.
- The login form keeps its values after submitting.
- Switching between forms:
  - The login form shows a short prompt with a link to `/signup` (e.g. "Don't have an account? Sign up").
  - The signup form shows a short prompt with a link to `/login` (e.g. "Already have an account? Log in").
  - Links use Next.js client-side navigation.
- Styling follows project conventions: component-specific styles in a co-located CSS module, theme colours from `globals.css`, and no more than one Tailwind class applied directly per element (combine others via `@apply`).
- The form works at mobile widths without horizontal scrolling.

## Possible Edge Cases
- User toggles password visibility, then submits: the logged password should still be the full typed value.
- User toggles visibility several times while typing: focus and cursor position should remain usable, and the value must not change.
- A blocked signup submit (mismatch or too-short password) keeps all typed values so the user can correct them.
- A signup password of exactly 6 characters is accepted; 5 is rejected.
- An email with surrounding spaces or mixed case (e.g. " Name@Example.COM ") is logged as "name@example.com".
- Pressing Enter in any field submits the form; pressing Enter/Space on the toggle only toggles visibility.
- Password visibility state should reset to hidden when navigating between the login and signup pages.
- Browser autofill should populate the fields correctly (use appropriate autocomplete hints: current password on login, new password on signup for both password fields).

## Open Questions
None

## Testing Guidelines
Create test file(s) in the ./tests folder for the new feature, mirroring the source path (e.g. tests/components/), and create meaningful tests for the following cases, without going too heavy:
- Renders email and password fields with accessible labels, and the correct submit button text for each mode.
- The confirm password field appears in signup mode only.
- Password field is masked by default; clicking the toggle reveals it, clicking again hides it, and the toggle's accessible label updates accordingly. In signup mode, the toggle affects both password fields.
- Clicking the toggle does not submit the form.
- Submitting with filled fields calls the console log with the mode, the trimmed and lowercased email, and the password (spy on the console).
- Signup with mismatched passwords shows an error and does not log.
- Signup with a password shorter than 6 characters does not log.
- After a valid signup submit, all fields are cleared.
- Login mode shows a link to `/signup`; signup mode shows a link to `/login`.
