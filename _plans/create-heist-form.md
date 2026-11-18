# Plan: Create Heist Form (and reassignment)

Spec: `_specs/create-heist-form.md` · Branch: `claude/feature/create-heist-form` (already checked out; the spec isn't committed yet)

## Context
`/heists/create` is a stub, so nobody can make a heist yet, even though the heist schema (`types/firestore/heist.ts`), the deadline helper (`lib/heists.ts`) and the create rule in `firestore.rules` already exist. The spec adds:
- a create form that saves a heist and goes to `/heists`
- a reassignment page at `/heists/[id]/edit`, usable by a heist's creator or current assignee while the heist is active and before its deadline
- an assignee picker, loaded from `users`, shared by both pages
- tighter Firestore rules: 60/500 length limits, no new heist assigned to its creator, and the new reassignment permissions

## Approach

### 0. Housekeeping
- Copy this plan to `_plans/create-heist-form.md` (project convention).
- Before writing code, use Context7 to confirm the APIs this relies on:
  - Firestore `getDocs`, `getDoc`, `addDoc`, `updateDoc`, `serverTimestamp`
  - Next.js 16 dynamic route `params`, which is a Promise in a server `page.tsx`
  - Firestore rules `diff().affectedKeys().hasOnly()` and `string.size()`

### 1. Shared constants (`types/firestore/heist.ts`)
- Add `HEIST_TITLE_MAX_LENGTH = 60` and `HEIST_DESCRIPTION_MAX_LENGTH = 500` next to the deadline constants, with the same "keep in sync with `firestore.rules`" comment.

### 2. Data helpers (follow the `firestore-schemas` skill)
- **New `lib/users.ts`:**
  - `listCrew(): Promise<CrewMember[]>` reads `collection(db, COLLECTIONS.USERS)` with `getDocs` and maps each doc to `{ uid: doc.id, codeName }`, skipping docs without a string `codeName`.
  - It sorts with `localeCompare(…, { sensitivity: "base" })`.
  - `CrewMember` is exported from here. It's a view type, not a stored document, so it doesn't go in `types/firestore`.
- **`lib/heists.ts`** (next to `randomHeistDeadline`):
  - `createHeist({ title, description, creator, assignee })`:
    - builds a `CreateHeistInput` with `createdAt: serverTimestamp()`, `deadline: randomHeistDeadline()` and `finalStatus: "active"`
    - calls `addDoc` on the plain `COLLECTIONS.HEISTS` reference
    - `creator` is `{ uid, codeName }`, and the code name falls back to email exactly as the Navbar does
  - `getHeist(id): Promise<Heist | null>` uses `getDoc` with `heistConverter` and returns `null` if the heist doesn't exist.
  - `reassignHeist(id, assignee)` calls `updateDoc` with an `UpdateHeistInput` of `{ assignedTo, assignedCodename }` only.
  - `reassignBlocker(heist, uid, now = new Date())` is a pure function returning `null`, `"not-allowed"` or `"closed"`:
    - `"not-allowed"`: the user is neither the creator nor the assignee
    - `"closed"`: the heist isn't `active`, or its deadline has passed
  - The edit page uses `reassignBlocker` to decide between the form and a message, and it's easy to unit-test.

### 3. Components (built test-first with the `/component` workflow; each gets a folder, a CSS module with `@reference` and `@apply`, `index.ts`, and a test in `tests/components/`)
- **`AssigneeSelect`** (client):
  - **Props:** `id`, `value` (uid or `""`), `onChange(member | null)`, `exclude: string[]`.
  - **Loading:** calls `listCrew()` on mount and leaves out the `exclude` uids.
  - **Rendering:** a `<select>` keyed by uid, so duplicate code names stay separate options.
  - **States:**
    - loading: a disabled select reading "Loading crew…"
    - empty: "No one else has signed up yet"
    - error: `role="alert"` text plus a "Try again" button that reloads the list
  - **Duplicates:** a comment explains that duplicate code names are deliberately left ambiguous ("part of the mischief"; see the spec).
- **`CreateHeistForm`** (client):
  - **Structure:** follows `components/AuthForm/AuthForm.tsx`, with labelled fields, `useState`, a `submitting` flag and a `role="alert"` error, and borrows its CSS module classes.
  - **Fields:** Title (input), Description (textarea), and Assign to (`AssigneeSelect` with `exclude={[user.uid]}`).
  - **Checks:** values are trimmed. Lengths are counted with `[...s].length` as in AuthForm, against the new constants. Each error shows next to its own field.
  - **Deadline note:** built from `HEIST_MIN/MAX_DEADLINE_HOURS`.
  - **Button:** "Create heist", disabled while submitting, while signed out (as on `/preview`), or with no assignee chosen. That also covers the picker's loading, empty and error states.
  - **Submit:** `createHeist(…)`, then `router.push("/heists")`. On failure it shows an error and keeps the entered values.
- **`ReassignHeistForm`** (client, prop `heistId`):
  - **Loading:** `getHeist(heistId)` on mount, showing `Skeleton` while it loads.
  - **Messages:** "not found", "not allowed" or "closed", decided by `reassignBlocker`, each with a link to `/heists`.
  - **Otherwise:**
    - read-only title, description and current assignee, plus time left using the existing `components/Countdown`, with seconds taken from `deadline - now`
    - an `AssigneeSelect` with `exclude={[heist.assignedTo, user.uid]}`; the creator still appears when the assignee is signed in
    - a "Reassign heist" button that calls `reassignHeist` and then `router.push("/heists")`
  - **Errors:** a failed save shows an error and keeps the selection.

### 4. Pages
- `app/(dashboard)/heists/create/page.tsx` keeps its title and renders `<CreateHeistForm />`.
- **New** `app/(dashboard)/heists/[id]/edit/page.tsx`: a server page that awaits `params`, then renders a "Reassign heist" title and `<ReassignHeistForm heistId={id} />`.
- Both are protected by the existing `RequireAuth` in `app/(dashboard)/layout.tsx`, so nothing else is needed.
- `/preview` gets sections for `AssigneeSelect` and `CreateHeistForm`, which show their signed-out error state there. `ReassignHeistForm` needs a real heist, so it's left out.

### 5. Firestore rules (`firestore.rules`, heists block)
- **`isValidHeist`:** add `title.size()` 1–60 and `description.size()` 1–500.
- **create:** add `request.resource.data.assignedTo != request.auth.uid`.
- **update:** split into two allowed cases.
  - **Creator:** the existing checks, plus the reassignment conditions below whenever `assignedTo` changes.
  - **Current assignee:** `diff(resource.data).affectedKeys().hasOnly(['assignedTo', 'assignedCodename'])` together with the reassignment conditions.
- **Reassignment conditions** (a rules helper):
  - `resource.data.finalStatus == 'active'`
  - `request.time < resource.data.deadline`
  - the new `assignedTo` differs from the current one and from `request.auth.uid`
- Update the rule comments. The development catch-all still overrides everything until 1 Jan 2027; leave it as it is.
- Check the rules with the Firebase MCP `firebase_validate_security_rules` tool. Deploying them is a separate step, which I'll ask about before running.

### 6. Docs
- `.claude/skills/firestore-schemas/SKILL.md` "Security Rules": replace "only the creator can update" with the creator-or-assignee reassignment rule.
- `CLAUDE.md`: add `/heists/[id]/edit` to the `(dashboard)` route list.

## Critical files
- New: `lib/users.ts`, `components/AssigneeSelect/`, `components/CreateHeistForm/`, `components/ReassignHeistForm/`, `app/(dashboard)/heists/[id]/edit/page.tsx`
- Modified: `types/firestore/heist.ts`, `lib/heists.ts`, `app/(dashboard)/heists/create/page.tsx`, `app/(public)/preview/page.tsx`, `firestore.rules`, the firestore-schemas skill and `CLAUDE.md`

## Reused
- `useUser` (`components/UserProvider`)
- `RequireAuth` through the dashboard layout
- `Skeleton`
- `Countdown`
- `randomHeistDeadline`, `heistConverter`, `COLLECTIONS` and the heist types
- `AuthForm`'s form patterns, validation style and CSS
- the `.btn` global class

## Verification
- **Tests (from PowerShell, not Git Bash):** `npx vitest run`.
  - New tests:
    - `tests/components/AssigneeSelect.test.tsx`
    - `tests/components/CreateHeistForm.test.tsx`
    - `tests/components/ReassignHeistForm.test.tsx`
    - additions to `tests/lib/heists.test.ts` for `reassignBlocker` and `createHeist`'s payload
  - The tests mock `@/lib/users`, `@/lib/heists` (or `firebase/firestore`), `useUser` and `next/navigation`.
  - The cases come from the spec's Testing Guidelines.
- `npm run lint` must show no new errors. Two existing errors in untouched files are known. Then run `npm run build`.
- **Rules:** run `firebase_validate_security_rules`, then work through the spec's rules checklist by hand after deploying, if you approve deploying.
- **Manual in the app** (`npm run dev`, with two accounts):
  1. Create a heist as A, assigned to B. It saves and goes to `/heists`; check the document with the Firebase MCP `firestore_get_document`.
  2. Open `/heists/<id>/edit` as B and hand the heist back to A.
  3. Open it as a third user C and see the "not allowed" message.
  4. Check that blank and too-long fields are blocked.
