# Spec for User Auth State Hook

branch: claude/feature/user-auth-state-hook

## Summary
Pocket Heist now signs users up and logs them in through Firebase Auth, but nothing in the app knows who is signed in afterwards. This feature adds one shared source of truth for the current user, exposed through a `useUser` hook that any page or component can call. It returns `undefined` while Firebase is still checking, `null` when nobody is signed in, and the user otherwise, and every consumer re-renders automatically when that changes.

Every user also gets a code name, entered when they sign up and stored as the `displayName` on their Firebase Auth user, so the user object from `useUser` always carries it.

The feature also puts the hook to use straight away:
- the Navbar shows the signed-in user's code name and a logout button
- the `/` splash page sends users to `/heists` or `/login`
- `/heists` pages are only for signed-in users
- signed-in users are kept away from `/login` and `/signup`

## Functional Requirements

### The `useUser` hook
- Provide a `useUser` hook with three possible values:
  - `undefined`: auth state not known yet (Firebase is still checking on first load)
  - `null`: no user is signed in
  - a plain user object `{ uid, email, displayName }` built from the Firebase Auth user when someone is signed in, where `displayName` is their code name
- Any code that decides a user is signed out (redirects, signed-out UI) must check for `null` specifically, never just "no user", so that `undefined` is never treated as signed out.
- The hook can be used from any client page or component in both route groups, `(public)` and `(dashboard)`, without each one setting anything up itself.
- The whole app shares one subscription to Firebase Auth state, rather than each component that calls `useUser` starting its own.
- Every component using `useUser` updates automatically when the auth state changes: after signup, login or logout, and when a previous session is restored on page load or refresh.
- Right after signup, the user from `useUser` already includes the new code name. Consumers never see the new user without it.
- The subscription is cleaned up when the app unmounts, with no leaked listeners.
- Using `useUser` somewhere the shared auth state isn't available fails with a clear developer-facing error.

### Code name
- The signup form gets a required "Code name" field.
- The code name is trimmed of surrounding spaces. A blank code name, or one longer than 30 characters, blocks signup with an error message, like the existing password checks. Any characters are allowed, including emoji.
- On successful signup, the code name is saved as the `displayName` on the new Firebase Auth user.
- Code names don't need to be unique; two users can share one.
- The code name lives only on the Firebase Auth user; no profile data is stored in Firestore.
- The login form is unchanged.

### Navbar
- When a user is signed in, the Navbar shows their code name and a "Log out" button, alongside the existing "Create Heist" link. The email is not shown.
- If a signed-in user has no code name (for example, an account created before this feature), the Navbar falls back to showing their email.
- Clicking "Log out" signs the user out of Firebase and sends them to `/login`.
- While auth state is still unknown, the Navbar shows neither the code name nor the logout button, and its layout doesn't jump when they appear.
- New Navbar styles follow the project's CSS module and `@apply` conventions.

### Redirects and protected pages
- `/` (splash): once auth state is known, sends signed-in users to `/heists` and signed-out users to `/login`. While unknown, it keeps showing the splash content.
- `/heists`, `/heists/create` and `/heists/[id]`: while auth state is unknown, show a loading placeholder built from the existing `Skeleton` component instead of the page content. Signed-out users are sent to `/login`. Signed-in users see the page.
- `/login` and `/signup`: signed-in users are sent to `/heists`. Signed-out users see the form as now.
- These redirects shape what users see; they are not a security boundary. Data access stays protected by the Firestore security rules.
- Redirects replace the current history entry where sensible, so the browser's back button doesn't bounce users between pages that immediately redirect them again.

### General
- No new dependencies; build on the existing Firebase setup in `lib/firebase.ts`, React and Next.js.

## Possible Edge Cases
- First page load: the user is `undefined` rather than `null`, so no redirect fires and no signed-out UI shows until Firebase reports.
- Page refresh while signed in on `/heists`: the loading placeholder shows, then the page; there's no flash of the login page.
- Server rendering: the server can't know the user, so server-rendered output (splash content, loading placeholder, Navbar without user details) must match the first client render to avoid hydration warnings.
- Signup timing: Firebase reports the new user as signed in before the code name has been saved, so the app must not show or redirect with a user that's missing their code name.
- Signup succeeds but saving the code name fails: the signup is undone by deleting the new account, and the form shows an error so the user can try again. If deleting also fails, the user is signed out; the account then has no code name, and the Navbar's email fallback covers it.
- Successful login or signup: `AuthForm` already navigates to `/heists`, and the new `/login` and `/signup` redirect fires as well. Both go to the same place, and the user lands on `/heists` once.
- Existing accounts (such as test accounts created before this feature) have no code name and fall back to email in the Navbar.
- Signing out in another tab, or the account being disabled or deleted, updates this tab to `null` and sends a user on a `/heists` page to `/login`.
- Logout fails (e.g. a network error): the user stays signed in and isn't navigated away.
- Very long code names or emails shouldn't break the Navbar layout.
- Code names made only of spaces count as blank.
- Rapid login → logout → login sequences end in the correct final state and page.
- Many components calling `useUser` at once still share one subscription.
- Using the hook from a server component isn't supported, and this should be documented.

## Open Questions
None at this time. Decisions made while reviewing and planning the spec:
- The not-known-yet state is exposed as `undefined`, not a separate loading flag.
- `useUser` returns a plain `{ uid, email, displayName }` object rather than the raw Firebase user, so it updates reliably when the code name is saved.
- The code name is stored as the Firebase Auth user's `displayName`, entered at signup, at most 30 characters, and doesn't need to be unique.
- If the code name can't be saved, the signup is undone rather than leaving an account without one.
- The Navbar shows the code name (falling back to email) and a logout button as part of this feature.
- The `/` redirect, `/heists` protection, and the `/login` and `/signup` redirect are part of this feature.
- Protected pages show a `Skeleton`-based loading placeholder while auth is unknown.
- No profile data is stored in Firestore; the Firebase Auth user is enough.

## Testing Guidelines
Create test file(s) in the ./tests folder for the new feature, mirroring the source path (e.g. tests/components/), and create meaningful tests for the following cases, without going too heavy:
- `useUser` returns `undefined` before Firebase first reports, then `null` or the user once it does.
- The user from `useUser` includes `displayName` straight after signup.
- Consumers re-render when the auth state changes from signed out to signed in and back.
- The Firebase auth subscription is cleaned up on unmount.
- Using `useUser` without the shared auth state available throws a clear error.
- The signup form shows a "Code name" field, blocks a blank code name or one over 30 characters, and saves the trimmed code name as `displayName`.
- If saving the code name fails, the new account is deleted and the signup reports an error.
- The login form has no code name field.
- Navbar shows the code name and "Log out" for a signed-in user, falls back to email when there's no code name, and shows neither while auth is unknown.
- Clicking "Log out" signs out and navigates to `/login`.
- A protected `/heists` page shows the loading placeholder while auth is unknown, redirects to `/login` when signed out, and shows content when signed in.
- `/` redirects to `/heists` when signed in and to `/login` when signed out, and doesn't redirect while auth is unknown.
- `/login` and `/signup` redirect a signed-in user to `/heists`.
- Firebase Auth and the Next.js router are mocked in tests, so no real network calls or navigation happen.
