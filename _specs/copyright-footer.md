# Spec for Copyright Footer

branch: claude/feature/copyright-footer

## Summary
Add a small `Footer` component that shows a one-line copyright notice, e.g. "© 2026 Pocket Heist. All rights reserved." It sits at the bottom of every page in both shells: the public pages (splash, login, signup, preview) and the logged-in `/heists` pages. It is quiet and low-contrast, so it never competes with page content, and it stays at the bottom of the viewport on short pages instead of floating up under the content.

## Functional Requirements
- **Footer content:**
  - A single line: the © symbol, the current year, the name "Pocket Heist", and "All rights reserved."
  - The year comes from the current date, so it never needs a manual update. It should render the same on the server and in the browser, so it doesn't cause a hydration mismatch.
  - The name is plain text. It does not reuse the animated clock logo, to keep the footer quiet and avoid repeating the spinning icon on every page.
  - It shows a single year (e.g. 2026), not a range.
  - No links, icons or navigation in this version. Lay it out so a short row of links (e.g. privacy, GitHub repo) can be added beside or below the notice later, without restyling.
- **Semantics and accessibility:**
  - The footer is a `<footer>` landmark, so screen readers can jump to it as the page's content info.
  - It sits outside `<main>` in both layouts, next to it rather than inside it.
  - The text uses `text-body` on the dark background, a small size (about 14px), and is centred. Its contrast must meet WCAG 2.2 AA for normal text.
  - A thin top border using the `border` theme colour separates it from the page.
- **Placement:**
  - It is added to the public layout (`app/(public)/layout.tsx`) and the dashboard layout (`app/(dashboard)/layout.tsx`), after `<main>`.
  - On pages shorter than the viewport, it stays at the bottom of the screen. On longer pages it comes after the content, not fixed over it.
  - On the logged-in pages it shows whether or not the user is signed in, so it also appears while `RequireAuth` is loading or redirecting.
- **Conventions:**
  - It follows the project component structure: `components/Footer/` with `Footer.tsx`, `Footer.module.css` and an `index.ts` re-export.
  - Styles go in the CSS module using `@apply` with theme tokens. No new theme tokens or dependencies are needed.
  - A labelled "Footer" section on `/preview` shows the component on its own.

## Possible Edge Cases
- **Year change:** a page left open over New Year's Eve keeps showing the old year until it reloads. That's acceptable.
- **Server and browser in different years:** right around midnight on 31 December, the server and the browser could disagree on the year, which risks a hydration warning. The year should be decided in one place, so both sides render the same value.
- **Full-height pages:** the login, signup and splash pages use `.center-content` (`min-h-lvh`) or similar full-height layouts. Adding a footer after them would push it below the fold. The layout must account for the footer's height, so short pages don't scroll just to show it.
- **Narrow phones:** the line must wrap cleanly at 320px wide and not overflow sideways.
- **Preview page:** `/preview` gets the real footer from its layout and also shows a copy in its showcase. The showcase copy sits inside `<main>`, so browsers don't treat it as a second `contentinfo` landmark. Tests should still check that each layout renders only one page footer.

## Open Questions
- None. The copyright holder is "Pocket Heist", the year is a single year, the footer appears on all pages including login and signup, and the layout leaves room for links later.

## Testing Guidelines
Create test file(s) in the ./tests folder for the new feature, mirroring the source path (e.g. tests/components/), and create meaningful tests for the following cases, without going too heavy:
- The footer renders as a `contentinfo` landmark.
- It shows the © symbol, "Pocket Heist" and "All rights reserved."
- It shows the current year. Fake the system date (e.g. to a fixed date in a different year) so the test doesn't depend on when it runs.
- The public and dashboard layouts each render the footer once, after the main content.
