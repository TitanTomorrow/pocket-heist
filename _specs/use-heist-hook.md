# Spec for useHeists Hook

branch: claude/feature/use-heist-hook

## Summary
Heists can now be created and reassigned, but the `/heists` dashboard is still a stub with three empty headings: "Your Active Heists", "Heists You've Assigned" and "All Expired Heists". This feature adds a `useHeists` hook that subscribes to the `heists` collection in Firestore and returns a live list of heists for one of three views, and then uses it to fill in those three sections of the dashboard. The third heading becomes "Your Expired Heists", since it only shows the user's own heists.

The hook takes a single argument naming the view:
- `"active"`: heists assigned **to** the signed-in user that are still open
- `"assigned"`: heists the signed-in user has assigned to someone else (they created them) that are still open
- `"expired"`: heists the signed-in user created or is assigned to that are over, either because their deadline has passed or because they have a final status of success or failure

Because the data is real time, a heist created, reassigned or closed anywhere (in another tab or by another user) appears in, moves between, or leaves the right section without a page refresh.

## Functional Requirements

### The `useHeists` hook
- Provide a client-only `useHeists` hook that takes one argument: `"active"`, `"assigned"` or `"expired"`. Any other value is a type error.
- The hook returns an object with:
  - the list of heists for that view (using the existing `Heist` type, built with the existing `heistConverter`)
  - a loading flag that is true until the first snapshot for the current view has arrived
  - an error value that is set if the subscription fails (e.g. permission denied or a network error), and empty otherwise
- The hook reads the signed-in user from the existing `useUser` hook. It does not take a user id argument.
- While the auth state is unknown, or the user is signed out, the hook does not query Firestore and reports loading (unknown) or an empty list (signed out).
- Each view is defined as:
  - **active**: `assignedTo` is the current user, `finalStatus` is `"active"`, and the deadline is still in the future
  - **assigned**: `createdBy` is the current user, `finalStatus` is `"active"`, and the deadline is still in the future
  - **expired**: the current user is either the creator (`createdBy`) or the assignee (`assignedTo`), and either the deadline has passed or `finalStatus` is `"success"` or `"failure"`. Other users' heists are never included
- Ordering:
  - active and assigned: soonest deadline first
  - expired: most recently expired (latest deadline) first
- The expired list is capped at the 20 most recent heists. There is no pagination or "load more".
- The active and assigned lists are not capped.
- The list updates in real time through a Firestore snapshot listener: additions, edits (such as a reassignment or a status change) and deletions are reflected without a refresh.
- A heist whose deadline passes while the page is open moves from the active or assigned list to the expired list without a refresh, even though no Firestore document changed.
- The hook is read-only. It never writes to Firestore; in particular, it doesn't update a heist's stored `finalStatus` when its deadline passes. A heist past its deadline but still marked `"active"` is only shown as expired.
- The snapshot listener (and any timer used for deadline changes) is cleaned up when the component unmounts, when the argument changes, and when the user changes (e.g. logout), so no listeners leak and no stale results from the previous view or user are shown.
- If any Firestore queries need composite indexes, add them to `firestore.indexes.json` so they deploy with the project.
- The hook lives in a new top-level `hooks/` folder and is imported as `@/hooks/useHeists`.
- No new dependencies; build on the existing Firebase setup in `lib/firebase.ts`, the `COLLECTIONS` constant and `heistConverter` in `types/firestore`, and follow the `firestore-schemas` skill conventions.

### `/heists` dashboard page
- `app/(dashboard)/heists/page.tsx` keeps its three sections, each filled by one call to `useHeists`. The first two headings stay as they are and the third is renamed:
  - "Your Active Heists": `useHeists("active")`
  - "Heists You've Assigned": `useHeists("assigned")`
  - "Your Expired Heists" (was "All Expired Heists"): `useHeists("expired")`
- Each heist in a list shows:
  - its title, linking to `/heists/[id]`
  - the other person involved: who assigned it (active), who it's assigned to (assigned), or both (expired), by code name
  - for active and assigned heists, the time remaining, using the existing `Countdown` component
  - for expired heists, the outcome: "Success", "Failure", or "Expired" for a heist still marked active whose deadline has passed
- While a section is loading, it shows a placeholder built from the existing `Skeleton` component.
- A section with no heists shows a short, friendly empty message (e.g. "No active heists. Time to cause some trouble." with a link to `/heists/create` in the active and assigned sections).
- A section whose subscription fails shows a short error message in the `text-error` colour; the other sections keep working.
- The page becomes a client component (it uses hooks). It's already inside `RequireAuth`, so it only renders for signed-in users.
- Any list or item markup that's reused across the three sections is pulled into a component under `components/` following the project's component conventions (folder, CSS module, `index.ts`), and that component gets a labelled section on `/preview`.
- Styles follow the project's CSS module and `@apply` conventions, with no more than one Tailwind class applied directly to an element.

## Possible Edge Cases
- A heist reassigned away from the current user disappears from their active list, and appears in the new assignee's active list, live.
- A heist the user created and later had handed back to them by its assignee shows in both "active" (assigned to them) and "assigned" (created by them). It appears once in "expired", not twice.
- A heist the user was once assigned but has since been reassigned to someone else doesn't appear in their expired list (only the current creator and assignee count).
- A heist whose deadline passes while the page is open moves to expired at about the moment its `Countdown` reaches zero, rather than lingering at zero.
- When a newly expired heist joins a full expired list, the oldest one drops off so it stays at 20.
- A heist just created in this tab has a pending server timestamp for `createdAt`; it still shows correctly (the converter already estimates it).
- The user logs out while the page is open: the listeners are torn down before Firestore starts rejecting reads, so no permission errors are shown.
- The argument passed to `useHeists` changes between renders: the old subscription is closed and the list resets to loading rather than briefly showing the previous view's heists.
- Firestore rejects a query because a required index is missing: the section shows the error state instead of hanging on the loading placeholder.
- Very long titles or code names shouldn't break the list layout.
- Server rendering: the server can't know the user, so the first client render must match (loading placeholders) to avoid hydration warnings.

## Open Questions
None at this time. Decisions made while reviewing the spec:
- The hook is named `useHeists`, since it returns a list.
- The expired view only includes heists the current user created or is assigned to, not every user's, and its heading is renamed to "Your Expired Heists" to match.
- The expired list is capped at the 20 most recent, with no pagination.
- Nothing updates a heist's stored `finalStatus` when its deadline passes; it's only displayed as expired.

## Testing Guidelines
Create test file(s) in the ./tests folder for the new feature, mirroring the source path (e.g. tests/hooks/useHeists.test.tsx and tests/components/ for any new component), and create meaningful tests for the following cases, without going too heavy:
- `useHeists` reports loading until the first snapshot arrives, then returns the heists from it.
- Each argument (`"active"`, `"assigned"`, `"expired"`) subscribes with the right filters for the current user, and the expired view never includes heists the user neither created nor is assigned to.
- The expired list returns at most 20 heists, most recent first.
- A later snapshot (a heist added, changed or removed) updates the returned list.
- A heist whose deadline passes moves out of the active list and into the expired list without a new snapshot (use fake timers).
- The hook never writes to Firestore.
- A subscription error is returned as the error value and loading ends.
- The hook doesn't subscribe while the user is unknown or signed out.
- The listener is unsubscribed on unmount and when the argument or user changes.
- The `/heists` page renders the three headings (including "Your Expired Heists"), a loading placeholder per section, each section's heists once loaded (title linking to `/heists/[id]` and the right code name), the empty message for an empty section, and an error message for a failed section.
- Expired heists show "Success", "Failure" or "Expired" as appropriate.
- Firestore and `useUser` are mocked in tests, so no real network calls happen.
