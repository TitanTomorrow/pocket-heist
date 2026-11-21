import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import Countdown from "@/components/Countdown"

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows the starting time as hours, minutes and seconds", () => {
    render(<Countdown seconds={41 * 3600 + 12 * 60 + 8} />)
    expect(screen.getByText("41:12:08")).toBeInTheDocument()
  })

  it("pads single-digit hours", () => {
    render(<Countdown seconds={5 * 3600 + 3} />)
    expect(screen.getByText("05:00:03")).toBeInTheDocument()
  })

  it("counts down once a second", () => {
    render(<Countdown seconds={61} />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText("00:01:00")).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText("00:00:58")).toBeInTheDocument()
  })

  it("stops at zero", () => {
    render(<Countdown seconds={2} />)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText("00:00:00")).toBeInTheDocument()
  })

  it("exposes the remaining time as a machine-readable duration", () => {
    render(<Countdown seconds={3661} />)
    expect(screen.getByText("01:01:01")).toHaveAttribute("datetime", "PT1H1M1S")
  })

  it("restarts when the seconds prop changes", () => {
    const { rerender } = render(<Countdown seconds={61} />)
    expect(screen.getByText("00:01:01")).toBeInTheDocument()

    rerender(<Countdown seconds={120} />)

    expect(screen.getByText("00:02:00")).toBeInTheDocument()
  })

  it("uses elapsed wall time when the browser delays an interval", () => {
    vi.setSystemTime(new Date("2026-11-21T12:00:00Z"))
    render(<Countdown seconds={100} />)

    vi.setSystemTime(Date.now() + 65_000)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText("00:00:34")).toBeInTheDocument()
  })
})
