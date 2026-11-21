import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import HeistCardSkeleton from "@/components/HeistCardSkeleton"

describe("HeistCardSkeleton", () => {
  it("is hidden from screen readers, since the page announces loading itself", () => {
    const { container } = render(<HeistCardSkeleton count={3} />)
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true")
    expect(screen.queryByRole("status", { hidden: true })).not.toBeInTheDocument()
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
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
