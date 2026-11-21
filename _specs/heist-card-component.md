# Spec for Heist Card Component

branch: claude/feature/heist-card-component
figma_component (if used): HeistCard

## Summary
Add a `HeistCard` component that shows one open heist as a card, and a `HeistCardSkeleton` placeholder with the same shape. On the `/heists` page, the "Active Heists" and "Assigned Heists" sections show their heists as cards in a 3-column grid. While those heists load, the same grid is filled with skeleton cards. Each card's title links to that heist's details page (`/heists/:id`). The details page itself stays as the existing stub; this feature adds no content to it.

Expired heists are out of scope. The expired section keeps its current list rendering.

## Functional Requirements
- **HeistCard** shows a single open heist with:
  - The heist title as a link to `/heists/<id>`. Titles wrap onto two lines at most, and longer titles are cut off with an ellipsis.
  - A clock status icon at the top right.  - A "To:" row: user icon, the label, then the assignee's codename.
  - A "By:" row: user icon, the label, then the creator's codename.
  - A deadline row: calendar icon, the deadline as a short date and time (e.g. "Dec 5, 05:00 PM"), a "•" separator, then the time left using the existing `Countdown` component in its current HH:MM:SS format. If the deadline had already passed when the card rendered, it shows "Overdue" instead.
- Only the title is a link. The rest of the card is not clickable.
- The time left keeps counting down while the page is open, without a reload. `Countdown` already handles this.
- **HeistCardSkeleton** is a loading placeholder with the card's size, border, background, padding and layout: two title bars, then three meta rows, each a small square and a short bar. It uses the same pulse animation as the existing `Skeleton`. Screen readers hear one "Loading" status for the section, not one for each placeholder.
- **The `/heists` page:**
  - The "Active Heists" and "Assigned Heists" sections each show their heists as `HeistCard`s in a grid. The grid has 1 column by default, 2 from Tailwind's `sm` breakpoint and 3 from `lg`, with a 16px gap between rows and columns.
  - While a section is loading, its grid shows 3 `HeistCardSkeleton`s, one full row on wide screens.
  - Each section keeps its existing error message and empty message (with its "Create a heist" link).
  - `HeistList` stays the component each section uses. For the "active" and "assigned" views it renders the card grid, and the skeleton grid while loading. For the "expired" view it renders exactly as it does now, with no cards.
- **Data:** cards use the heists already provided by the `useHeists` hook for the "active" and "assigned" views. No new Firestore queries, indexes or rules are needed.
- **The `/heists/:id` details page** is left exactly as it is.
- **Conventions:** both components follow the project component structure: a folder, a CSS module, and an `index.ts` re-export. Each gets a labelled section on `/preview` that shows short-title, long-title, nearly-due and overdue cards, plus a grid of skeletons. Use the fixed sample heists and fixed "now" time already there, so the preview looks the same on every load.

## Figma Design Reference (only if referenced)
- File: https://www.figma.com/design/5SPp2zqzMTMaNdrT9V0oZS/GC-Page-Designs?node-id=0-1&p=f&m=dev (page "Dashboard", frame "Heists Dashboard for Pocket Heist", HeistCard master node 54:60)
- Component name: HeistCard
- Key visual constraints:
  - **Card shape:** about 378px wide at 2 columns. Column layout with a 12px gap and about 20px padding. 1px border, 10px corner radius, no shadow. The height grows with the title, so don't fix it.
  - **Colours:** the background is `bg-lighter` (#101828). The border is #1E2939, which has no theme token yet, so add one (e.g. a `border` colour) to the `@theme` block.
  - **Title:** Inter 16/24, regular weight, white (`text-heading`), with slight negative letter-spacing. A 16px clock icon in `text-primary` sits at the top right, aligned with the first line.
  - **Meta rows:** 14/20 text, 8px apart, each with a 12px icon and an 8px gap after it. Labels and the date use `text-body` (#99A1AF). The "To" codename, the countdown or "Overdue", and the clock icon use `text-primary` (#C27AFF). The "By" codename uses `text-secondary` (#FB64B6).
  - **Grid:** Figma draws 2 columns with 16px gaps. The 3-column layout is the requested change; keep the 16px gap.
  - **Icons** (lucide-react, matched by shape): Clock for status, User for "To" and "By", Calendar for the deadline.
  - **Not designed in Figma:** hover and focus states, the skeleton, and the empty state. Infer them from the card and the existing `.btn` and `Skeleton` styles. A visible focus outline on the title link is required.

## Possible Edge Cases
- **Long titles:** up to 60 characters. They are clamped to two lines, and the full title is still available to the link's accessible name.
- **Deadline passing:** a heist's deadline can pass while the page is open. `Countdown` stops at 00:00:00, and the `useHeists` hook then moves the heist out of the active and assigned views. A card that renders after its deadline has already passed shows "Overdue" instead of a countdown.
- **More than 24 hours left:** deadlines can be up to 72 hours away. `Countdown` shows these as hours past 24 (e.g. "71:59:59"), which is expected.
- **Heists in two sections:** a heist the user both created and is assigned to appears in both sections, each with its own card.
- **Uneven card heights:** a card with a one-line title sits next to one with a two-line title. Rows should still line up neatly.
- **No heists:** a section with no heists shows its empty message, not an empty grid.
- **Narrow screens:** the grid falls back to a single column without horizontal scrolling.

## Open Questions
All resolved:
- **Grid breakpoints:** 1 column by default, 2 from `sm`, 3 from `lg`.
- **Countdown:** use the existing `Countdown` unchanged (HH:MM:SS), not Figma's short "4h 42m" form.
- **What is clickable:** only the title links to `/heists/:id`.
- **Skeleton count:** 3 per loading section.
- **HeistList:** keep it as the component each section uses. It renders the expired section exactly as now, and the card grid for active and assigned.

## Testing Guidelines
Create test file(s) in the ./tests folder for the new feature, mirroring the source path (e.g. tests/components/), and create meaningful tests for the following cases, without going too heavy:
- `HeistCard` renders the title as a link to `/heists/<id>`.
- `HeistCard` shows the "To" and "By" codenames and the deadline date.
- `HeistCard` shows a countdown for a future deadline, and "Overdue" for a deadline that has passed. Use a fixed "now".
- Only the title is a link; the card contains no other links.
- `HeistCardSkeleton` exposes a loading status to assistive technology and contains no links or heist text.
- On the `/heists` page, with `useHeists` mocked:
  - The active and assigned sections render one card per heist.
  - 3 skeletons show while a section is loading.
  - The expired section still renders without cards.
