import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import PublicLayout from "@/app/(public)/layout"

describe("Public layout", () => {
  it("renders one footer straight after main, outside it", () => {
    render(
      <PublicLayout>
        <p>Page body</p>
      </PublicLayout>,
    )
    const main = screen.getByRole("main")
    const footers = screen.getAllByRole("contentinfo")

    expect(main).toHaveTextContent("Page body")
    expect(footers).toHaveLength(1)
    expect(main).not.toContainElement(footers[0])
    expect(main.nextElementSibling).toBe(footers[0])
  })
})
