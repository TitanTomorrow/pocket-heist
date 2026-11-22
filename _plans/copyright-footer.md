# Plan: Copyright Footer

Spec: `_specs/copyright-footer.md` · Branch: `claude/feature/copyright-footer`

## Context
Today neither shell has a footer:
- `app/(public)/layout.tsx` renders `<main className="public">{children}</main>`.
- `app/(dashboard)/layout.tsx` renders `<Navbar />` then `<main><RequireAuth>{children}</RequireAuth></main>`.
- `app/layout.tsx` wraps `<body>` content in `<UserProvider>`, which renders only a context provider and no DOM. So the group layouts' elements are direct children of `<body>`.
- The full-height pages set their own height. Login, signup, `/heists/create` and `/heists/[id]/edit` use `.center-content` (`min-h-lvh`). The splash uses `.splash` (`min-h-lvh`) in `app/(public)/page.module.css`. All of them are the direct child of `<main>`, because `RequireAuth` returns `children` with no wrapper.

The spec adds a quiet `<footer>` with a one-line copyright notice after `<main>` in both layouts.

There are two hard parts:
- **Sticky bottom without overflow.** If a footer is added after a `min-h-lvh` page, it sits below the fold. The fix is a page shell: `body` becomes a `min-h-dvh` flex column and `main` grows to fill the space. The full-height pages then fill `main` (`flex-1`) instead of the viewport. This also fixes an existing quirk: `/heists/create` and `/heists/[id]/edit` currently scroll by the navbar's height.
- **The year without a hydration mismatch.** `Footer` is a Server Component with no `"use client"` and no hooks, so it computes the year once, on the server. React never re-renders it in the browser, so the browser's clock is never consulted and no mismatch is possible.
  - Without `cacheComponents` (not enabled in `next.config.ts`), `new Date()` in a Server Component doesn't raise the Next 16 `next-prerender-current-time` error. That error only applies to Cache Components.
  - The catch: `new Date()` runs during static prerender, so the year would be frozen at build time.
  - Fix: `export const revalidate = 86400` in `app/layout.tsx` (ISR). Every route then re-renders at most daily, so the year rolls over within about a day of New Year without a redeploy.

Assumptions to check (the spec has no open questions):
- **Revalidation:** daily ISR on every route is acceptable. Every page is currently static, with client-side data, so the cost is negligible. The alternative is to accept the build year until the next deploy.
- **Viewport unit:** `min-h-dvh` rather than the existing `lvh`, so on mobile the footer sits at the bottom of the visible viewport while the browser toolbar is showing.
- **Preview position:** the `/preview` Footer section goes last.

APIs confirmed with Context7:
- **Next.js 16:**
  - With `cacheComponents` off, route segment config `revalidate` works in layouts, and the lowest value across a route's layouts and pages wins.
  - `connection()` and `"use cache"` are the Cache Components alternatives. Neither is needed here.
- **React:** the `react-hooks/purity` lint rule flags impure time calls during render.
- **Tailwind v4:** `min-h-dvh`, `flex-1`, `shrink-0`, `text-balance`.
- **Vitest 4:** `vi.useFakeTimers({ now, toFake: ["Date"] })` and `vi.useRealTimers()`.

## Approach

### 0. Housekeeping
- The branch `claude/feature/copyright-footer` is checked out and the spec isn't committed yet. Commit the spec and this plan together when the user approves.

### 1. Page shell: `app/globals.css`, `app/(public)/page.module.css`
- **`body`:** extend the existing rule to `@apply font-sans text-body bg-dark flex min-h-dvh flex-col`. Add a comment that the shell is a column (optional navbar, main, footer).
- **`body > main`:** add `@apply flex flex-1 flex-col`.
  - `main` grows, which pushes the footer to the bottom on short pages.
  - It is itself a column, so a full-height page inside it can grow.
  - The child combinator means neither layout's markup needs a new class.
- **`.center-content`:** replace `min-h-lvh` with `flex-1`. It fills `main` (the viewport minus navbar and footer) and still centres its content.
- **`.splash`:** replace `min-h-lvh` with `w-full flex-1`.
  - `w-full` is needed because `mx-auto` on a flex-column item stops it stretching.
  - `max-w-6xl` still caps the width.
- **Unaffected:** `.page-content` already has an explicit width (`w-6xl max-w-full`), so `mx-auto` still centres it.

### 2. `components/Footer/` (via `/component`, test-first)
Write `tests/components/Footer.test.tsx` first (step 5), watch it fail, then build:
- **`Footer.tsx`:** `export default function Footer()`, with no props, no `"use client"` and no hooks, so it stays a Server Component.
  - `const year = new Date().getFullYear()`.
  - Markup: `<footer className={styles.footer}><div className={styles.inner}><p className={styles.notice}>© {year} Pocket Heist. All rights reserved.</p></div></footer>`.
  - The name is plain text, with no `Clock8` logo.
  - `.inner` exists so a links `<ul>` can be added later as a sibling of the `<p>`.
  - Add a comment saying it must stay a Server Component, so the year is decided once on the server.
  - **Lint:** if `npm run lint` reports `react-hooks/purity` on the `new Date()` line, add one `// eslint-disable-next-line react-hooks/purity` with that same reason. Don't hide the call in a helper to dodge the rule.
- **`Footer.module.css`:** starts with `@reference "../../app/globals.css";`. Every element has one class built with `@apply`:
  - `.footer`: `shrink-0 border-t border-border px-4 py-6`.
  - `.inner`: `mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2`. Future links sit beside the notice on wide screens and wrap below it on narrow ones.
  - `.notice`: `text-center text-sm text-balance text-body`.
    - The colour is set explicitly so the preview copy looks the same anywhere.
    - `text-body` (#99A1AF) on `bg-dark` (#030712) is about 7.7:1, which passes WCAG 2.2 AA for normal text.
    - Normal wrapping plus `text-balance` keeps the line clean at 320px.
- **`index.ts`:** `export { default } from "./Footer"`.

### 3. Layouts
- **`app/(public)/layout.tsx`:** import `Footer` from `@/components/Footer` and return a fragment: `<main className="public">{children}</main>` then `<Footer />`.
- **`app/(dashboard)/layout.tsx`:** add `<Footer />` after `</main>`, outside `RequireAuth`, so it shows while auth is loading, redirecting or signed out.
- **`app/layout.tsx`:** add `export const revalidate = 86400`, with a comment that it keeps the footer's server-rendered year current without a redeploy.
- Both group layouts stay Server Components, so `Footer` renders on the server.

### 4. `app/(public)/preview/page.tsx`
- Import `Footer` and add a final `<section><h2>Footer</h2><Footer /></section>`.
- The copy sits inside `<main>` and a `<section>`, so it isn't a second `contentinfo` landmark. The real footer still comes from the layout.

### 5. Tests (Vitest, run from PowerShell)
- **`tests/components/Footer.test.tsx`** (new). Use `afterEach(() => vi.useRealTimers())`.
  - The footer is the single `contentinfo` landmark.
  - It shows "©", "Pocket Heist" and "All rights reserved.", and has no link.
  - **Year:** use `vi.useFakeTimers({ now: new Date(2031, 5, 15), toFake: ["Date"] })`. The footer's text content is exactly `© 2031 Pocket Heist. All rights reserved.`.
    - The local mid-year date means no timezone can shift the year.
    - Faking only `Date` leaves React's scheduling alone.
- **`tests/app/(public)/layout.test.tsx`** (new): render the default export with `<p>Page body</p>`.
  - There is exactly one `contentinfo`.
  - `main` contains "Page body".
  - The footer isn't inside `main`, and `main.nextElementSibling` is the footer.
  - No mocks are needed.
- **`tests/app/(dashboard)/layout.test.tsx`** (new). Mocks follow the `vi.hoisted` pattern in `tests/components/RequireAuth.test.tsx`:
  - Mock `@/components/Navbar` to a stub `<div data-testid="navbar" />`, so the test doesn't depend on its auth actions or `Link`s.
  - Mock `next/navigation` (`useRouter: () => ({ replace: vi.fn() })`).
  - Mock `@/components/UserProvider` (`useUser: () => m.user`).
  - Keep the real `RequireAuth`.
  - **Signed in:**
    - The children are inside `main`.
    - There is one `contentinfo`.
    - The order is the navbar, then `main`, then the footer, with `main.nextElementSibling` being the footer.
  - **Auth loading (`user` undefined):**
    - A `status` placeholder shows and the children don't.
    - The footer is still present, once, after `main`.
- Run `npx vitest run` from PowerShell. Git Bash breaks the `@/` alias.

## Critical files
- **New:**
  - `components/Footer/{Footer.tsx, Footer.module.css, index.ts}`
  - `tests/components/Footer.test.tsx`
  - `tests/app/(public)/layout.test.tsx`
  - `tests/app/(dashboard)/layout.test.tsx`
- **Modified:**
  - `app/globals.css` (`body`, `body > main`, `.center-content`)
  - `app/(public)/page.module.css` (`.splash`)
  - `app/(public)/layout.tsx`
  - `app/(dashboard)/layout.tsx`
  - `app/layout.tsx` (`revalidate`)
  - `app/(public)/preview/page.tsx`
- **Reused:** the theme tokens `text-body`, `border` and `bg-dark`, and the `RequireAuth` mocking pattern from its tests.
- **Unchanged:** `Navbar`, `RequireAuth`, `UserProvider`, `next.config.ts`, and the Firestore rules and indexes. Nothing needs deploying.

## Verification
1. Run `npx vitest run` from PowerShell. Every test file passes, including the three new ones.
2. `npm run lint` is clean, apart from a justified `react-hooks/purity` disable if it was needed. `npm run build` succeeds, and the build output shows routes with a 1d revalidate.
3. Start `npm run dev` and check:
   - On `/`, `/login` and `/signup`, the footer sits at the bottom of the viewport with no vertical scrollbar on a normal desktop window, and the content is still vertically centred.
   - On `/preview`, a long page, the footer comes after the content and isn't fixed over it. The showcase copy appears under the "Footer" heading.
   - Signed in, the footer is at the bottom on `/heists/create` and `/heists`. It is also visible during the auth-loading skeleton and while a signed-out visit to `/heists` redirects.
   - At 320px wide (DevTools), the notice wraps cleanly with no sideways scroll.
   - The console has no hydration warnings.
   - A screen reader's landmarks list shows exactly one "content info" per page.
