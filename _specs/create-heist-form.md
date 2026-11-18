# Spec for Create Heist Form

branch: claude/feature/create-heist-form

## Summary
`/heists/create` is still a stub with only a title. This feature turns it into a working form that lets a signed-in user plan a heist and hand it to another member of the crew. The user enters a title and description and picks an assignee from a list of code names loaded from the Firestore `users` collection. On submit, a new document is added to the `heists` collection and the user is taken to `/heists`.

Each heist's deadline is not chosen by the user: it is set at random to between 24 and 72 hours after creation, as the heist schema and Firestore rules already require. The form tells the user this up front.

Heists can also change hands after they are created: the user who created a heist, or the user it is currently assigned to, can reassign it to someone else. This feature adds a reassignment page at `/heists/[id]/edit`, updates the Firestore rules to allow exactly that, and shares one assignee picker between the two pages.

## Functional Requirements

### The form
- `/heists/create` shows a "Create a New Heist" form with three fields:
  - **Title**: required. Surrounding spaces are trimmed. Blank, or longer than 60 characters, blocks submit with an error message.
  - **Description**: required. Surrounding spaces are trimmed. Blank, or longer than 500 characters, blocks submit with an error message. Multi-line text is allowed.
  - **Assign to**: required. A choice of crew members, shown by code name, loaded from the `users` collection.
- Above the submit button, a short line explains that the deadline is set at random to between 24 and 72 hours from now. The numbers come from the existing `HEIST_MIN_DEADLINE_HOURS` and `HEIST_MAX_DEADLINE_HOURS` constants, not hard-coded text.
- The submit button reads "Create heist". While the heist is being saved, it is disabled and shows that saving is in progress, so the heist can't be submitted twice.
- Validation errors appear next to the field they belong to, and fields are labelled so they can be found by label, as in `AuthForm`.
- The form is a new component following the project's component conventions (its own folder, CSS module using `@apply` with theme tokens, `index.ts` re-export), and visually matches the existing `AuthForm`. It is added to `/preview`.

### Choosing an assignee
- The assignee list is loaded from the `users` collection: each user's uid and code name.
- The signed-in user is left out of the list. Heists are assigned to other users, never to their creator.
- Code names are listed alphabetically, ignoring case.
- Code names aren't unique, so two users can appear with the same name and can't be told apart. That ambiguity is deliberate, part of the mischief, and is left as it is. The assignee picker's code carries a comment saying so, so nobody "fixes" it later.
- While the list is loading, the assignee field shows a loading state and the form can't be submitted.
- If no other users exist yet, the field says so and the form can't be submitted.
- If the list fails to load, the field shows an error with a way to try again.

### Saving the heist
- On a valid submit, one new document is added to the `heists` collection, following the existing heist schema in `types/firestore` and the project's Firestore conventions (collection name constant, heist converter):
  - `title` and `description`: the trimmed values entered.
  - `createdBy` and `createdByCodename`: the signed-in user's uid and code name.
  - `assignedTo` and `assignedCodename`: the chosen user's uid and code name, as listed when the form was submitted.
  - `createdAt`: the server's time.
  - `deadline`: a random time 24–72 hours from now, from the existing `randomHeistDeadline`.
  - `finalStatus`: `active`.
- The saved document must pass the Firestore rules for creating a heist.
- The Firestore rules for creating a heist are tightened to match the form:
  - the title is 1–60 characters and the description 1–500 characters
  - the heist is not assigned to its creator (`assignedTo` differs from `createdBy`)
- On success, the user is taken to `/heists`.
- On failure, the form shows an error message, keeps everything the user entered, and lets them submit again.

### Reassigning a heist
- A heist can be reassigned to another user by either its creator or its current assignee. Nobody else can reassign it.
- Reassigning changes only the assignee (`assignedTo` and `assignedCodename`). The creator, creation time, deadline and everything else stay as they are.
- A heist can only be reassigned while its `finalStatus` is `active` and its deadline hasn't passed. Once it is finished or expired, its assignee is fixed.
- The new assignee must differ from the current assignee and from the user doing the reassigning. An assignee may hand a heist back to its creator.
- The Firestore rules for heists are updated to match:
  - The creator keeps the update rights they have now, except that changing the assignee follows the reassigning rules above.
  - The current assignee may update a heist only to change its assignee, with every other field unchanged.
  - Any change of assignee, by either of them, is refused once the heist is no longer `active` or its deadline has passed.
  - The title and description length limits apply to updates as well as creates.
- The assignee picker is one shared component, used by both the create form and the reassignment page, and told which users to leave out.

### The reassignment page
- A new page at `/heists/[id]/edit`, in the `(dashboard)` route group, so it has the Navbar and is protected like the other `/heists` pages.
- It loads the heist with that id and shows its title, description, current assignee (by code name) and time left, read-only.
- Below that, an "Assign to" field using the shared assignee picker. It leaves out the current assignee and the signed-in user. The creator appears in the list when the signed-in user is the assignee, so they can hand it back.
- The button reads "Reassign heist". While saving, it is disabled and shows that saving is in progress.
- On a successful reassignment the user is taken to `/heists`. On failure, the page shows an error, keeps the chosen assignee, and lets them try again.
- Only reassigning is possible on this page. Editing the title, description or status is out of scope.
- Instead of the form, the page shows a clear message, with a link back to `/heists`, when:
  - no heist has that id
  - the signed-in user is neither the creator nor the current assignee
  - the heist is no longer `active`, or its deadline has passed
- While the heist is loading, the page shows a loading placeholder built from the existing `Skeleton` component.
- Nothing links to this page yet, since the heist list and detail pages are still stubs. It is reached by its URL until those pages add links.

### General
- `/heists/create` and `/heists/[id]/edit` are protected like the other `/heists` pages: signed-out users are sent to `/login`.
- No new dependencies; build on the existing Firebase setup, `useUser`, and heist schema.

## Possible Edge Cases
- The signed-in user has no code name (an account from before code names existed). They can still create a heist; `createdByCodename` falls back to the same value the Navbar shows (their email), so the document still passes the rules.
- Two users share a code name. Both appear in the list with the same name and can't be told apart, and the creator may pick the wrong one. This is accepted as part of the game.
- A user's code name changes after a heist is assigned. The heist keeps the code name it was saved with.
- The chosen assignee deletes their account before the form is submitted. The heist is still created, assigned to a uid that no longer exists.
- The user is signed out in another tab while filling in the form. The existing protection sends them to `/login`, and the unsaved entries are lost.
- The user's clock is wrong. The rules check the deadline against the server's time with a 5-minute margin. A clock that is badly off makes the save fail, and the form shows its error.
- Saving is slow or the network drops. The button stays disabled and the user sees that saving is in progress until it succeeds or fails.
- Title or description made only of spaces counts as blank.
- Very long code names in the assignee list don't break the layout.
- The form is shown on `/preview` where nobody may be signed in. The assignee list then shows its error or empty state instead of crashing the page.
- An assignee reassigns a heist to themselves, or to the person it is already assigned to. Both are refused, since nothing would change.
- The creator reassigns a heist to themselves. Refused, as heists are never assigned to their creator.
- The current assignee tries to change anything other than the assignee, such as the title or status. The rules refuse it.
- Someone tries to reassign a heist whose deadline has just passed, or which is marked `success` or `failure`. The rules refuse it.
- The deadline passes while the reassignment page is open. The save is refused and the page shows its error.
- Someone else reassigns the heist while the reassignment page is open. If the signed-in user was the assignee, they no longer are, so the rules refuse their save and the page shows its error.
- The URL's heist id is malformed or the heist has been deleted. The page shows its "no heist" message rather than crashing.
- Until the temporary development rule in `firestore.rules` expires (1 Jan 2027), any signed-in user can still write any document. The new heist rules take full effect only once that rule is removed.

## Open Questions
None at this time. Decisions made while reviewing the spec:
- Reassigning happens on its own page at `/heists/[id]/edit`, built as part of this feature, not on the heist detail page.
- A heist can only be reassigned while it is `active` and before its deadline.
- Users can't assign heists to themselves. The rules refuse a new heist assigned to its creator, but an assignee may hand a heist back to its creator later.
- Users who share a code name aren't told apart. The ambiguity is part of the mischief, and the code says so.
- Titles are limited to 60 characters and descriptions to 500, enforced in the form and in the Firestore rules.
- There is no Firestore emulator, and none is added. The rules are checked by hand rather than with automated tests.

## Testing Guidelines
Create test file(s) in the ./tests folder for the new feature, mirroring the source path (e.g. tests/components/), and create meaningful tests for the following cases, without going too heavy:
- The form shows labelled Title, Description and Assign to fields, a "Create heist" button, and the 24–72 hour deadline note.
- A blank or too-long title or description blocks submit and shows an error. Values are trimmed before saving.
- The assignee list shows other users' code names alphabetically and leaves out the signed-in user.
- The assignee field's loading, empty and failed-to-load states block submit, and the failed state offers a retry.
- A valid submit adds one heist with the right title, description, creator, assignee, `active` status, a server-set creation time and a deadline 24–72 hours away, then goes to `/heists`.
- The button is disabled while saving, so a second click doesn't create a second heist.
- A failed save shows an error, keeps the entered values and doesn't navigate.
- The reassignment page shows the heist read-only, offers every user except the current assignee and the signed-in user, and lists the creator when the assignee is signed in.
- A valid reassignment changes only the assignee and code name, then goes to `/heists`. A failed one shows an error and doesn't navigate.
- The reassignment page shows its message instead of the form when the heist doesn't exist, the user is neither creator nor assignee, or the heist is finished or past its deadline.
- There is no Firestore emulator, so the rules have no automated tests. After changing them, check them with the Firebase rules validator, then confirm by hand that the creator and the current assignee can reassign an active heist and nobody else can. Also confirm that an assignee who changes any other field is refused, as is a reassignment after the deadline or once the heist is finished, and that a title or description over its limit is refused.
- Firestore, `useUser` and the Next.js router are mocked in component tests, so no real network calls or navigation happen.
