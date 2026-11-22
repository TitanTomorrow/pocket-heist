import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, it, expect, vi } from "vitest"
import type { Heist } from "@/types/firestore"

// component imports
import HeistDetails from "@/components/HeistDetails"

const HOUR = 60 * 60 * 1000
const now = new Date("2026-11-19T12:00:00Z").getTime()

function heist(overrides: Partial<Heist> = {}): Heist {
  return {
    id: "h1",
    title: "Swap the CEO's mug",
    description: "Replace it with the one that says World's Okayest Boss.",
    createdBy: "boss",
    createdByCodename: "Velvet Otter",
    assignedTo: "me",
    assignedCodename: "Silent Falcon",
    createdAt: new Date(now - 2 * HOUR),
    deadline: new Date(now + 5 * HOUR + 30 * 60 * 1000),
    finalStatus: "active",
    ...overrides,
  }
}

// The value paired with a <dt> label in the heist's facts list
function fact(label: string) {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling
}

describe("HeistDetails", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows the title as the page heading", () => {
    render(<HeistDetails heist={heist()} now={now} />)
    expect(screen.getByRole("heading", { level: 1, name: "Swap the CEO's mug" })).toBeInTheDocument()
  })

  it("can use a lower heading level", () => {
    render(<HeistDetails heist={heist()} now={now} headingLevel={3} />)
    expect(screen.getByRole("heading", { level: 3, name: "Swap the CEO's mug" })).toBeInTheDocument()
  })

  it("shows who it's assigned to, who created it and the details", () => {
    render(<HeistDetails heist={heist()} now={now} />)
    expect(fact("Assigned to")).toHaveTextContent("Silent Falcon")
    expect(fact("Created by")).toHaveTextContent("Velvet Otter")
    expect(screen.getByText("Replace it with the one that says World's Okayest Boss.")).toBeInTheDocument()
  })

  it("counts down the time left", () => {
    vi.useFakeTimers()
    render(<HeistDetails heist={heist()} now={now} />)
    expect(fact("Time left")).toHaveTextContent("05:30:00")
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(fact("Time left")).toHaveTextContent("05:29:59")
  })

  it("shows it has expired once the countdown runs out", () => {
    vi.useFakeTimers()
    render(<HeistDetails heist={heist({ deadline: new Date(now + 2000) })} now={now} />)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByText("Time left", { selector: "dt" })).not.toBeInTheDocument()
    expect(fact("Outcome")).toHaveTextContent("Expired")
  })

  it("shows how a closed heist ended instead of a countdown", () => {
    render(<HeistDetails heist={heist({ finalStatus: "success" })} now={now} />)
    expect(screen.queryByText("Time left", { selector: "dt" })).not.toBeInTheDocument()
    expect(fact("Outcome")).toHaveTextContent("Success")
  })

  it("shows a heist past its deadline as expired", () => {
    render(<HeistDetails heist={heist({ deadline: new Date(now - HOUR) })} now={now} />)
    expect(fact("Outcome")).toHaveTextContent("Expired")
  })
})
