# Plan: useHeists Hook and Heists Dashboard

Spec: `_specs/use-heist-hook.md` · Branch: `claude/feature/use-heist-hook` (already checked out; the spec isn't committed yet)

## Context
`/heists` is a stub with three empty headings. Heists can already be created and reassigned (`lib/heists.ts`, `types/firestore/heist.ts`), but nothing lists them. The spec adds a real-time `useHeists(view)` hook (`"active" | "assigned" | "expired"`) and uses it to fill the three dashboard sections. The third section is renamed "Your Expired Heists" and only shows heists the user created or is assigned to, capped at 20. Nothing writes to Firestore.

The hard part is time: a heist moves from active to expired when its deadline passes, but no document changes, so a Firestore query alone can't do it. The approach is to query by user and deadline relative to a fixed subscription time `T0`, then split by the current time on the client, with a timer that wakes up at the next deadline.

## Approach

### 0. Housekeeping
- Copy this plan to `_plans/use-heist-hook.md` (project convention).
- Before coding, confirm with Context7: Firestore `onSnapshot` (and its error callback), `or()`, `where`, `orderBy`, `limit` in the modular SDK, and `renderHook` from Testing Library.

### 1. Pure helpers in `lib/heists.ts`
- `isHeistOpen(heist, now: Date): boolean` returns true when `finalStatus === "active"` and the deadline is after `now`. Refactor `reassignBlocker` to use it for its `"closed"` check (same behaviour, so the existing tests stay green).
- `heistOutcome(heist): "Success" | "Failure" | "Expired"` maps `success`, `failure` and anything else (active but past its deadline).
- `EXPIRED_HEISTS_LIMIT = 20`.

### 2. Query builders in `lib/heists.ts` (follow the `firestore-schemas` skill)
All of these run on `collection(db, COLLECTIONS.HEISTS).withConverter(heistConverter)`.
- `upcomingHeistsQuery(uid, role: "assignee" | "creator" | "either", after: Date)`
  - The role filter is `assignedTo == uid`, `createdBy == uid`, or `or(both)`.
  - Then `where("deadline", ">", after)` and `orderBy("deadline")`.
  - This set is small, since every deadline is at most 72 hours after creation.
  - It filters on user and deadline only, not `finalStatus`. The client splits by status, which keeps the index count down.
- `pastHeistsQuery(uid, before: Date)` is `or(createdBy == uid, assignedTo == uid)` with `where("deadline", "<=", before)`, `orderBy("deadline", "desc")` and `limit(EXPIRED_HEISTS_LIMIT)`.

### 3. Composite indexes in `firestore.indexes.json`
Add four composite indexes on `heists`, each with one equality field and `deadline`:
- `assignedTo ASC, deadline ASC`
- `createdBy ASC, deadline ASC`
- `assignedTo ASC, deadline DESC`
- `createdBy ASC, deadline DESC`

Each branch of the OR queries uses one of them.

### 4. Hook: `hooks/useHeists.ts` (new top-level folder)
- It's a `"use client"` hook. It exports `type HeistView = "active" | "assigned" | "expired"` and returns `{ heists: Heist[], loading: boolean, error: string | null, now: number }`.
  - `now` is when the lists were last evaluated. The list component uses it to seed `Countdown`.
  - This follows the existing `loadedAt` pattern in `ReassignHeistForm`, which keeps `Date.now()` out of render for the React 19 purity lint rule.
- It reads `useUser()`:
  - `undefined` means no subscription, and the hook reports `loading: true` with no heists.
  - `null` means no subscription, and the hook reports `loading: false` with no heists.
- State is a single object tagged with a key, `${uid}:${view}`, holding `upcoming`, `past`, `now` and `error`.
  - `loading` is derived: the key doesn't match, or a list the view needs hasn't arrived yet.
  - Changing the view or the user therefore shows loading straight away, never the previous view's list.
  - Nothing calls `setState` synchronously inside the effect, which keeps the set-state-in-effect lint rule happy.
- The effect, keyed on `uid` and `view`, captures `T0 = new Date()` and calls `onSnapshot` on:
  - **active:** `upcomingHeistsQuery(uid, "assignee", T0)`
  - **assigned:** `upcomingHeistsQuery(uid, "creator", T0)`
  - **expired:** `upcomingHeistsQuery(uid, "either", T0)` and `pastHeistsQuery(uid, T0)`. The first is needed so heists that expire, or get closed, during the session appear.
  - Each snapshot callback stores its docs plus `now: Date.now()`.
  - The error callback logs the raw error with `console.error`, so the missing-index link stays visible to developers. It stores a friendly message and ends loading.
  - Cleanup unsubscribes from every listener.
- A deadline timer, in a second effect keyed on the upcoming list and `now`:
  - It finds the soonest upcoming deadline after `now`, then sets a `setTimeout` for just after it that updates `now`.
  - Cleanup clears the timer.
- The derived list, in a `useMemo`:
  - **active and assigned:** the upcoming heists where `isHeistOpen(h, now)`, already in soonest-first order.
  - **expired:** past heists plus upcoming heists that aren't open, de-duplicated by id, sorted by deadline (latest first), and cut to `EXPIRED_HEISTS_LIMIT`.

### 5. Component: `components/HeistList/` (via `/component`, test-first)
- Props: `{ view: HeistView, heists, loading, error, now }`. It needs no `"use client"`, because it has no hooks and `Countdown` is already a client component.
  - **loading:** shows `<Skeleton />`.
  - **error:** shows `<p role="alert">` styled `text-error`.
  - **empty:** shows a friendly message. The active and assigned views add a link to `/heists/create`.
  - **otherwise:** shows a `<ul>` of items.
- Each item has:
  - the title as a `next/link` `Link` to `/heists/[id]`
  - a code name line:
    - "From {createdByCodename}" for active
    - "To {assignedCodename}" for assigned
    - "{createdByCodename} → {assignedCodename}" for expired
  - for active and assigned, `<Countdown key={id} seconds={(deadline - now) / 1000} />`
  - for expired, an outcome label from `heistOutcome`
- `HeistList.module.css` starts with `@reference "../../app/globals.css";`, uses `@apply` classes, and truncates or wraps long titles and code names. It's re-exported from `index.ts`.
- Add a "HeistList" section to `app/(public)/preview/page.tsx`. It shows active, assigned and expired lists plus the empty, loading and error states, using fixed sample heists and a fixed `now` so the static page is deterministic.

### 6. Page: `app/(dashboard)/heists/page.tsx`
- Add `"use client"`. Call `useHeists` three times and render each section's `<h2>` with a `<HeistList>`, keeping the wrappers `active-heists`, `assigned-heists` and `expired-heists`.
- Rename the third heading to "Your Expired Heists".

### 7. Tests (Vitest, run from PowerShell)
- **`tests/lib/heists.test.ts`:**
  - Extend the `firebase/firestore` mock so `query`, `where`, `or`, `orderBy` and `limit` return plain descriptors, and give `collection` a `withConverter` method.
  - Test `isHeistOpen`, `heistOutcome`, each role of `upcomingHeistsQuery`, and `pastHeistsQuery`, including that it caps at 20 and sorts descending.
  - Existing `reassignBlocker` tests keep passing.
- **`tests/hooks/useHeists.test.tsx`:**
  - Mock `@/components/UserProvider`, `@/lib/firebase`, and `firebase/firestore`'s `onSnapshot`, capturing callbacks and returning spy unsubscribers. Keep the real `lib/heists` helpers, and use `renderHook`.
  - Test that the hook:
    - is loading until the first snapshot, and later snapshots update the list
    - builds the right query per view
    - doesn't subscribe when the user is unknown or signed out
    - returns the error and ends loading when the subscription fails
    - unsubscribes on unmount and when the view or user changes
    - moves a heist from active to expired with fake timers and no new snapshot
    - caps the expired list at 20 and de-duplicates it
    - never calls `addDoc`, `setDoc`, `updateDoc` or `deleteDoc`
- **`tests/components/HeistList.test.tsx`:** loading, error, empty (with or without the create link), the item link href, the code name line per view, and the "Success", "Failure" and "Expired" labels.
- **`tests/app/(dashboard)/heists/page.test.tsx`:** mock `@/hooks/useHeists`. The page shows three headings, including "Your Expired Heists", and a failure in one section doesn't affect the others.

### 8. Deploy the indexes (asks you first)
The new queries fail in the live app until the indexes exist. Deploy with the Firebase MCP `firebase_deploy` using the `"firestore"` target, since `"firestore:rules"` silently deploys nothing. That target also re-deploys the unchanged rules. Then confirm the indexes are listed with `firestore_list_indexes`. Building them takes a few minutes. **I'll check with you before deploying**, because it changes the live project.

## Critical files
- New: `hooks/useHeists.ts`, `components/HeistList/{HeistList.tsx, HeistList.module.css, index.ts}`, plus the test files above
- Modified: `lib/heists.ts`, `firestore.indexes.json`, `app/(dashboard)/heists/page.tsx`, `app/(public)/preview/page.tsx`, `tests/lib/heists.test.ts`
- Reused: `heistConverter` and `COLLECTIONS` (`types/firestore`), `useUser` (`components/UserProvider`), `Countdown`, `Skeleton`, and `reassignBlocker`'s open/closed logic

## Verification
1. `npx vitest run` from PowerShell: all suites pass, old and new.
2. `npm run lint` is clean and `npm run build` succeeds.
3. After the indexes are deployed, run `npm run dev` with two accounts (A and B):
   - A creates a heist for B. It appears live under A's "Heists You've Assigned" and B's "Your Active Heists" with a ticking countdown.
   - B reassigns it to a third user. It leaves B's list without a refresh.
   - Seed a heist with a near deadline (Firebase MCP `firestore_update_document` on a test doc). It moves to "Your Expired Heists" as "Expired" when the countdown hits zero.
   - No errors in the console. `/preview` shows the HeistList section.
