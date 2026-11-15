---
description: Create a UI component using TDD (test-driven development)
allowed-tools: Read, Write, Edit, Glob, Bash(npx vitest:*)
argument-hint: [Brief description]
---

## User Input

The user has provided information about the component to make: **$ARGUMENTS**

### 0. Ensure PascalCase:

From the component information above, determine a PascalCase component name (e.g., "a card showing user stats" → `UserStatsCard`).

### 1. Write Tests First
Create `tests/components/[ComponentName].test.tsx` with 2-3 simple tests:
- Test that the component renders
- Test key elements are present (roles, text)

Pattern:
```tsx
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import ComponentName from "@/components/ComponentName"

describe("ComponentName", () => {
  it("renders successfully", () => {
    render(<ComponentName />)
    // assertions
  })
})
```

### 2. Run Tests (expect failure)
```bash
npx vitest run tests/components/[ComponentName].test.tsx
```

### 3. Create Component
- `components/[ComponentName]/[ComponentName].tsx`
- `components/[ComponentName]/[ComponentName].module.css`
- `components/[ComponentName]/index.ts` → `export { default } from "./[ComponentName]"`

Start the CSS module with `@reference "../../app/globals.css";` so `@apply` can use the theme colours.

Conventions: no semicolons, CSS Modules, theme colours from globals.css when needed. Do NOT apply tailwind classes directly in component templates unless essential or just 1 at the most. If an element needs more than a single tailwind class, combine them into a custom class using the '@apply' directive


### 4. Run Tests (expect pass)
```bash
npx vitest run tests/components/[ComponentName].test.tsx
```

Iterate on component development until all tests pass.

### 5. Add to Preview Page
Update `app/(public)/preview/page.tsx` with a labelled section showing the component.

## Rules
- Keep tests minimal
- Only move on when each step has the expected result: tests fail in step 2 and pass in step 4.
- Run tests from PowerShell, not Git Bash. From Git Bash the `@/` path alias fails to resolve, so every test file fails to load (including ones that already passed), which looks like a real failure.
