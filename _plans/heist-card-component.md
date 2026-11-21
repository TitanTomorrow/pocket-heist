# Plan: Heist Card Component

Spec: `_specs/heist-card-component.md`. Branch: `claude/feature/heist-card-component`, already checked out. The spec isn't committed yet.

This plan was written by the spec-planner agent. On approval, the first step saves it to `_plans/heist-card-component.md`.

## Context
`/heists` already lists the signed-in user's heists live:
- `useHeists(view)` returns `{ heists, loading, error, now }`.
- `HeistList` renders each section as a stacked `<ul>`. Open heists show a `Countdown`, expired heists show an outcome label, and a single `<Skeleton />` shows while loading.

The spec adds `HeistCard` and `HeistCardSkeleton`:
- The active and assigned sections switch to a responsive card grid.
- The expired section stays as it is.
- There are no new queries, indexes or rules, so nothing needs deploying.

Resolved decisions:
- The grid is 1 column by default, 2 from `sm` and 3 from `lg`, with a 16px gap.
- `Countdown` is reused unchanged (HH:MM:SS).
- Only the title is a link.
- Each loading section shows 3 skeletons.
- `HeistList` stays the component each section uses.
- A card whose deadline had already passed when it rendered shows "Overdue".

There are three hard parts:
- **Screen readers:** a section full of placeholders must announce "Loading" once.
- **The deadline date:** it must be formatted without a new dependency, and the tests must pass in any timezone.
- **"Overdue":** it has to be decided without calling `Date.now()` during render, which React 19's purity lint rule forbids.

## Steps

### 0. Housekeeping
- Save this plan to `_plans/heist-card-component.md`.
- APIs checked with Context7:
  - **Tailwind v4:** `line-clamp-<n>`; `@theme` `--color-*` tokens generate `border-*` and `bg-*` utilities; `@apply` accepts responsive variants.
  - **Next.js 16:** `Link` passes `className` through to its `<a>`.

### 1. `app/globals.css`
- Add `--color-border: #1E2939;` to `@theme`. This is the Figma card border colour, which has no token yet.
- Add a global `.heist-grid` class: `@apply grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`.
  - It's shared by `HeistList`, `HeistCardSkeleton` and `/preview`.
  - `minmax(0,1fr)` columns prevent horizontal scrolling on narrow screens.
  - Grid items stretch by default, so rows line up.

### 2. `components/HeistCard/` (with `/component`, test-first)
- **Props:** `{ heist: Heist, now: number }`. `now` is the hook's `now`, passed down the way `HeistList` already seeds `Countdown`. The component needs no `"use client"`.
- **Markup:** `<article>` containing:
  - a header row: an `<h3>` holding `<Link href={`/heists/${id}`}>` around the title, with an `aria-hidden` lucide `Clock` (16px, `text-primary`) at the right
  - three meta `<p>` rows, each with an `aria-hidden` 12px icon:
    - `User`, "To:", then `assignedCodename` in `text-primary`
    - `User`, "By:", then `createdByCodename` in `text-secondary`
    - `Calendar`, `<time dateTime={iso}>` with the formatted date, an `aria-hidden` "•", then the time left
- **Date:** a module-level `Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })`.
  - Replace U+202F (narrow no-break space) with a normal space, so the output is exactly "Dec 5, 05:00 PM" in Node and every browser.
  - No new dependency.
- **Overdue:** `secondsLeft = (deadline - now) / 1000`.
  - If it's `<= 0`, show `<span>Overdue</span>`.
  - Otherwise show `<Countdown seconds={secondsLeft} />`.
- **CSS module:** starts with `@reference "../../app/globals.css";`. Every element gets one class built with `@apply`. Key classes:
  - `.card`: `flex min-w-0 flex-col gap-3 rounded-[10px] border border-border bg-lighter p-5`. The height isn't fixed.
  - `.title`: `line-clamp-2 break-words text-heading`. Hover and focus-visible turn it `text-primary`, and focus-visible adds a `.btn`-style `outline-secondary` outline. The link's accessible name is still the full title.
  - `.status`: `mt-1 shrink-0 text-primary`.
  - `.meta`: `flex flex-col gap-2 text-sm`.
  - `.icon`: `text-body`.
  - `.to`: `text-primary`.
  - `.by`: `text-secondary`.
  - `.timeLeft`: `text-primary`.

### 3. `components/HeistCardSkeleton/` (with `/component`, test-first)
- **Props:** `{ count?: number }`, defaulting to 1.
- **Markup:** one `<div role="status" aria-busy="true" className="heist-grid">` with:
  - `count` placeholder cards, each `aria-hidden` with `data-testid="heist-card-skeleton"`
  - one sr-only "Loading...", the same pattern as `components/Skeleton/Skeleton.tsx`
- That gives one "Loading" announcement per section.
- **Each placeholder:**
  - It has the same box as the card, with `animate-pulse` and `motion-reduce:animate-none`.
  - It holds two title bars at full and two-thirds width, filling two 24px lines.
  - Below those are three meta rows, each a `size-3` square plus a short bar.
  - The bars use `bg-border`, so they show up on the `bg-lighter` card.

### 4. `components/HeistList/` (update its tests first)
- **Active and assigned views:**
  - While loading, they render `<HeistCardSkeleton count={3} />`.
  - When loaded, they render `<ul className="heist-grid">` with `<li><HeistCard heist now /></li>` for each heist.
- **Expired view:** unchanged. It keeps its `<Skeleton />`, its list markup and `people()`, which now only builds the "creator → assignee" string.
- **Error and empty states:** unchanged.
- **Cleanup:** remove the `Countdown` import and the `.time` CSS class, which are no longer used.

### 5. Pages
- **`app/(dashboard)/heists/page.tsx`:** no change. The cards come through `HeistList`.
- **`app/(public)/preview/page.tsx`:**
  - Add a "HeistCard" section: a `.heist-grid` of four cards, built with the existing `sampleHeist` and `previewNow`:
    - short title, 5.5 hours left
    - 60-character title, 41.2 hours left
    - nearly due, 3 minutes left
    - overdue, 2 hours past its deadline
  - Add a "HeistCardSkeleton" section with `count={3}`.
  - Move the HeistList Active, Assigned and Loading examples out of `.preview-grid` into full-width blocks.

### 6. Tests (Vitest, from PowerShell)
Fixtures use a local-time deadline, `new Date(2026, 11, 5, 17, 0)`, so they pass in any timezone. They also use a fixed `now`.

- **`tests/components/HeistCard.test.tsx`** (new):
  - The link's href is `/heists/h1`, and it is the only link.
  - The To and By codenames show, along with "Dec 5, 05:00 PM".
  - It shows "02:00:00" when 2 hours are left, and "Overdue" with no countdown once the deadline has passed.
  - A long title is still the link's full name.
- **`tests/components/HeistCardSkeleton.test.tsx`** (new): one `status` with `aria-busy`, "Loading..." once, 3 placeholders, and no links or headings.
- **`tests/components/HeistList.test.tsx`** (updated):
  - Active and assigned render one `article` per heist, with both codenames. These replace the "From …" and "To …" assertions.
  - Loading active shows one status with 3 placeholders.
  - The expired, error and empty tests are unchanged.
- **`tests/app/(dashboard)/heists/page.test.tsx`** (updated):
  - Keep the existing `vi.hoisted` `useHeists` mock, keyed by view.
  - Scope each section with `within(...)` and check:
    - cards in the active and assigned sections
    - 3 skeletons each while loading
    - the expired section has no `article`

## Critical files
- **New:**
  - `components/HeistCard/*`
  - `components/HeistCardSkeleton/*`
  - `tests/components/HeistCard.test.tsx`
  - `tests/components/HeistCardSkeleton.test.tsx`
  - `_plans/heist-card-component.md`
- **Modified:**
  - `app/globals.css`
  - `components/HeistList/{HeistList.tsx, HeistList.module.css}`
  - `app/(public)/preview/page.tsx`
  - `tests/components/HeistList.test.tsx`
  - `tests/app/(dashboard)/heists/page.test.tsx`
- **Reused:**
  - `components/Countdown`
  - the `components/Skeleton` status pattern
  - `useHeists`'s `now`
  - the `Heist` type
  - the preview page's `sampleHeist` and `previewNow`
- **Unchanged:** the `/heists` page, the `/heists/[id]` stub, `hooks/useHeists.ts`, `lib/heists.ts`, and the Firestore rules and indexes.

## Verification
1. Run `npx vitest run` from PowerShell. Every test file passes.
2. `npm run lint` is clean and `npm run build` succeeds.
3. Start `npm run dev` and open `/preview`:
   - The cards show, with long titles clamped to 2 lines and countdowns ticking.
   - "Overdue" shows on the overdue card.
   - Tabbing to a title shows a focus outline.
   - The skeletons pulse.
   - Resizing shows 1, 2 and 3 columns with no horizontal scrolling.
4. Sign in and open `/heists`:
   - Skeletons show, then cards.
   - The titles link to the unchanged `/heists/<id>` stub.
   - Empty sections show their messages.
   - The expired section looks the same as before.
   - There are no console or hydration errors.
