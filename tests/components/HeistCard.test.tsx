import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import type { Heist } from "@/types/firestore"

// component imports
import HeistCard from "@/components/HeistCard"

// Local time, so the formatted date is the same in any timezone
const deadline = new Date(2026, 11, 5, 17, 0)
const HOUR = 60 * 60 * 1000

function heist(overrides: Partial<Heist> = {}): Heist {
  return {
    id: "h1",
    title: "Swap the CEO's mug",
    description: "d",
    createdBy: "boss",
    createdByCodename: "Velvet Otter",
    assignedTo: "me",
    assignedCodename: "Silent Falcon",
    createdAt: new Date(deadline.getTime() - 24 * HOUR),
    deadline,
    finalStatus: "active",
    ...overrides,
  }
}

const twoHoursBefore = deadline.getTime() - 2 * HOUR

describe("HeistCard", () => {
  it("links the title, and only the title, to the heist's page", () => {
    render(<HeistCard heist={heist()} now={twoHoursBefore} />)
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAccessibleName("Swap the CEO's mug")
    expect(links[0]).toHaveAttribute("href", "/heists/h1")
  })

  it("shows who it's to, who it's by and the deadline", () => {
    render(<HeistCard heist={heist()} now={twoHoursBefore} />)
    expect(screen.getByText("Silent Falcon")).toBeInTheDocument()
    expect(screen.getByText("Velvet Otter")).toBeInTheDocument()
    expect(screen.getByText("Dec 5, 05:00 PM")).toBeInTheDocument()
  })

  it("counts down the time left before the deadline", () => {
    render(<HeistCard heist={heist()} now={twoHoursBefore} />)
    expect(screen.getByText("02:00:00")).toBeInTheDocument()
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument()
  })

  it("shows Overdue instead of a countdown once the deadline has passed", () => {
    render(<HeistCard heist={heist()} now={deadline.getTime() + HOUR} />)
    expect(screen.getByText("Overdue")).toBeInTheDocument()
    expect(screen.queryByText(/^\d{2}:\d{2}:\d{2}$/)).not.toBeInTheDocument()
  })

  it("keeps the full title as the link name when it's long", () => {
    const title = "Hide every stapler on the third floor before the review!!!"
    render(<HeistCard heist={heist({ title })} now={twoHoursBefore} />)
    expect(screen.getByRole("link")).toHaveAccessibleName(title)
  })
})
