import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import Skeleton from "@/components/Skeleton"

describe("Skeleton", () => {
  it("renders a loading status", () => {
    render(<Skeleton />)

    const status = screen.getByRole("status")
    expect(status).toBeInTheDocument()
    // aria-busy would hold back the announcement, and it is never cleared
    expect(status).not.toHaveAttribute("aria-busy")
  })

  it("includes screen reader loading text", () => {
    render(<Skeleton />)

    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("can be purely visual when something else announces loading", () => {
    const { container } = render(<Skeleton decorative />)

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true")
    expect(screen.queryByRole("status", { hidden: true })).not.toBeInTheDocument()
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })
})
