# Plan: User Auth State Hook

Spec: `_specs/user-auth-state-hook.md` · Branch: `claude/feature/user-auth-state-hook` (already checked out)

## Context
Login and signup now go through Firebase Auth, but nothing else in the app knows who is signed in. The spec adds:
- a shared `useUser` hook that returns `undefined` while checking, `null` when signed out, or the user
- a code name entered at signup and saved as the Firebase `displayName`
- the code name and a logout button in the Navbar
- redirects for `/`, `/login`, `/signup` and the `/heists` pages

Decisions made while planning, which the spec gets updated to match:
- `useUser` returns a plain `{ uid, email, displayName }` object, not the raw Firebase `User`. Firebase changes its user object in place when the profile is saved, which React wouldn't notice.
- If the code name fails to save during signup, the signup is undone: the new account is deleted and the form shows an error.
- A code name is required and trimmed, at most 30 characters, and any characters are allowed.

## Approach

### 0. Housekeeping
- Copy this plan to `_plans/user-auth-state-hook.md` (project convention).
- Update the spec with the three decisions above: the user-object wording, the "saving the code name fails" edge case, and replacing the open question with the 30-character limit.
- Before writing code, use Context7 to confirm the Firebase Auth calls (`onAuthStateChanged`, `updateProfile`, `deleteUser`, `signOut`) and Next.js `useRouter().replace`, per CLAUDE.md.

### 1. `UserProvider`: the shared auth state (`components/UserProvider/`)
- **`UserProvider.tsx`** (`"use client"`):
  - **Type:** exports `AppUser = { uid: string, email: string | null, displayName: string | null }`.
  - **State:** `user: AppUser | null | undefined`, starting as `undefined`. The server render and the first client render both see `undefined`, so they match and there are no hydration warnings.
  - **Subscription:** a single `onAuthStateChanged(auth, …)` call (with `auth` from `lib/firebase.ts`) inside `useEffect`. It turns each Firebase user into an `AppUser`, and the effect returns the unsubscribe function.
  - **Signup guard:** a `signupPending` ref. While it's set, the listener ignores signed-in users, so consumers never see a new user without a code name. Signed-out (`null`) updates still go through.
  - **Actions:** the context also provides `signUp`, `logIn` and `logOut`:
    - `signUp(email, password, codeName)`:
      1. Set `signupPending`.
      2. `createUserWithEmailAndPassword`.
      3. `updateProfile(user, { displayName: codeName })`.
      4. On success, publish the `AppUser` built from the updated user.
      5. If `updateProfile` fails, `deleteUser` the new account (falling back to `signOut` if that also fails), then rethrow.
      6. Clear `signupPending` in `finally`.
    - `logIn(email, password)` calls `signInWithEmailAndPassword`. The listener publishes the user.
    - `logOut()` calls `signOut(auth)`.
  - **Hooks:**
    - `useUser()` returns `user`.
    - `useAuthActions()` returns `{ signUp, logIn, logOut }`.
    - Both throw `"useUser must be used inside <UserProvider>"` (or the `useAuthActions` equivalent) when the context is missing. The context's default value is `null` so a missing provider can be detected.
- **`index.ts`:** default export `UserProvider`, plus named exports `useUser`, `useAuthActions` and `type AppUser`.
- **`app/layout.tsx`:** wrap `{children}` in `<UserProvider>`. This covers both route groups; the server layout can render this client component.

### 2. `AuthForm`: add the code name and use the actions (`components/AuthForm/AuthForm.tsx`)
- **Code name field:** signup only, the first field, labelled "Code name", `autoComplete="nickname"`, `maxLength={30}`.
- **Signup checks, before the password checks:**
  - a trimmed code name that's empty shows "Please enter a code name"
  - over 30 characters shows "Code name must be 30 characters or fewer"
- **Firebase calls:** replace the direct imports with `useAuthActions()`. Signup calls `signUp(email, password, codeName.trim())`; login calls `logIn(...)`.
- **Unchanged:** the error-message map, the `submitting` state, and `router.push("/heists")` on success.
- **Styles:** reuse the existing `.field`, `.label` and `.input` classes.

### 3. Redirect components
- **`components/AuthRedirect/`** (`"use client"`, renders nothing):
  - Props: `signedInTo?: string` and `signedOutTo?: string`.
  - In an effect, it calls `router.replace` only when `user !== undefined`. It checks `null` explicitly for the signed-out case.
  - Used on:
    - `app/(public)/page.tsx`: `<AuthRedirect signedInTo="/heists" signedOutTo="/login" />`, added to the existing splash markup, which stays a server component.
    - `app/(public)/login/page.tsx` and `signup/page.tsx`: `<AuthRedirect signedInTo="/heists" />`.
  - Not used on `/preview`, so the AuthForm demos there keep working for signed-in users.
- **`components/RequireAuth/`** (`"use client"`):
  - `user === undefined`: renders `<Skeleton />`, reusing `components/Skeleton`.
  - `user === null`: calls `router.replace("/login")` in an effect and keeps rendering `<Skeleton />`, so protected content never flashes.
  - Otherwise: renders `children`.
  - Wired into `app/(dashboard)/layout.tsx` as `<main><RequireAuth>{children}</RequireAuth></main>`, so all three `/heists` pages are covered and the pages themselves don't change.

### 4. Navbar: code name and logout (`components/Navbar/`)
- **`Navbar.tsx`:** add `"use client"`, then use `useUser()`, `useAuthActions()` and `useRouter()`.
- **New `<li>`** before "Create Heist": a fixed-width user slot that's always rendered, so the layout doesn't jump.
  - Unknown or signed out: the slot is empty.
  - Signed in: it shows `displayName ?? email` and a `<button type="button">Log out</button>`.
- **Logging out:** `await logOut()`, then `router.replace("/login")`. If it fails, catch the error and stay put.
- **`Navbar.module.css`:**
  - `.userSlot`: flex row, fixed width, items aligned.
  - `.codeName`: `truncate`, so long names get an ellipsis.
  - `.logoutButton`: a text-style button using the theme tokens.
  - All built with `@apply`.

### 5. Preview
`/preview` already shows AuthForm, so its signup demo will gain the code name field automatically. `UserProvider`, `AuthRedirect` and `RequireAuth` have nothing visual to show, so they get no preview sections.

## Tests (tests/components/, written first, run from PowerShell)
Shared mocking pattern: `vi.hoisted` mocks for `next/navigation` (`useRouter` → `{ push, replace }`) and `@/components/UserProvider` (`useUser` → a mutable `mockUser`; `useAuthActions` → mock functions). `UserProvider`'s own tests mock `firebase/auth` and `@/lib/firebase` instead.
- **`UserProvider.test.tsx`:**
  - the user is `undefined` before the callback fires, then `null` or the `AppUser`
  - consumers re-render on sign in and back out
  - the subscription is cleaned up on unmount
  - `useUser` outside the provider throws
  - `signUp` publishes the user with `displayName`, and never publishes the user without it
  - when `updateProfile` fails, `signUp` deletes the user and rejects
- **`AuthForm.test.tsx`** (update to mock `useAuthActions` instead of `firebase/auth`):
  - existing cases
  - the "Code name" field appears in signup mode only
  - a blank code name and a 31-character code name are each blocked
  - the trimmed code name is passed to `signUp`
- **`Navbar.test.tsx`** (update with mocks):
  - existing cases
  - the code name and "Log out" show when signed in
  - the email shows when there's no `displayName`
  - neither shows while auth is unknown
  - "Log out" calls `logOut` and then `replace("/login")`
- **`AuthRedirect.test.tsx`:**
  - no redirect while unknown
  - signed in goes to `signedInTo`
  - signed out goes to `signedOutTo`
  - a missing prop means no redirect
- **`RequireAuth.test.tsx`:**
  - the Skeleton (`role="status"`) shows while unknown
  - signed out shows the Skeleton and calls `replace("/login")`
  - signed in renders the children

## Critical files
- **New:** `components/UserProvider/*`, `components/AuthRedirect/*`, `components/RequireAuth/*`, and the three matching test files
- **Changed:**
  - `app/layout.tsx`
  - `app/(dashboard)/layout.tsx`
  - `app/(public)/page.tsx`, `login/page.tsx`, `signup/page.tsx`
  - `components/AuthForm/AuthForm.tsx`
  - `components/Navbar/Navbar.tsx` and `Navbar.module.css`
  - `tests/components/AuthForm.test.tsx` and `Navbar.test.tsx`
  - `_specs/user-auth-state-hook.md`
- **Reused:** `lib/firebase.ts` (`auth`), `components/Skeleton`, and AuthForm's existing `.field`, `.label`, `.input` and `.error` styles

## Verification
1. `npx vitest run` from PowerShell: all suites pass.
2. `npx tsc --noEmit` is clean. `npm run lint` shows only the two existing errors, in `heists/page.tsx` and `app/layout.tsx`'s `@ts-ignore` (the layout file gets edited here, but its `@ts-ignore` line stays). `npm run build` succeeds.
3. `npm run dev`, then check by hand:
   - Signed out:
     - `/` goes to `/login`
     - `/heists` goes to `/login` with no content flash
   - Sign up with a code name: you land on `/heists`, the Navbar shows the code name, and the new user in the Firebase console (Authentication → Users) has that display name.
   - Refresh on `/heists`: the Skeleton shows briefly, then the page, with no bounce to `/login`.
   - Signed in:
     - `/login` and `/signup` go to `/heists`
     - `/` goes to `/heists`
   - Click "Log out": you go to `/login`, and `/heists` then redirects back to `/login`.
   - Log in with an older account that has no code name: the Navbar shows its email.
