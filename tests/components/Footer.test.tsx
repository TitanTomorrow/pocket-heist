import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"

// component imports
import Footer from "@/components/Footer"

describe("Footer", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders as the page's one contentinfo landmark", () => {
    render(<Footer />)
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1)
  })

  it("shows the copyright notice with no links", () => {
    render(<Footer />)
    const footer = screen.getByRole("contentinfo")
    expect(footer).toHaveTextContent("©")
    expect(footer).toHaveTextContent("Pocket Heist")
    expect(footer).toHaveTextContent("All rights reserved.")
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("shows the current year", () => {
    // Mid-year local date, so no timezone can shift the year; only Date is faked
    vi.useFakeTimers({ now: new Date(2031, 5, 15), toFake: ["Date"] })
    render(<Footer />)
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      /^© 2031 Pocket Heist\. All rights reserved\.$/,
    )
  })
})
