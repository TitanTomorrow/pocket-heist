import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import HeistCardSkeleton from "@/components/HeistCardSkeleton"

describe("HeistCardSkeleton", () => {
  it("announces loading once however many placeholders it shows", () => {
    render(<HeistCardSkeleton count={3} />)
    // aria-busy would hold back the announcement, and it is never cleared
    expect(screen.getByRole("status")).not.toHaveAttribute("aria-busy")
    expect(screen.getAllByText("Loading...")).toHaveLength(1)
    expect(screen.getAllByTestId("heist-card-skeleton")).toHaveLength(3)
  })

  it("shows one placeholder by default", () => {
    render(<HeistCardSkeleton />)
    expect(screen.getAllByTestId("heist-card-skeleton")).toHaveLength(1)
  })

  it("contains no links or headings", () => {
    render(<HeistCardSkeleton count={3} />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
  })
})
