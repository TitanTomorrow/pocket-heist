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
})
