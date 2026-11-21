import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import type { Heist } from "@/types/firestore"

// component imports
import HeistList from "@/components/HeistList"

const now = new Date("2026-11-19T12:00:00Z").getTime()
const HOUR = 60 * 60 * 1000

function heist(id: string, overrides: Partial<Heist> = {}): Heist {
  return {
    id,
    title: `Heist ${id}`,
    description: "d",
    createdBy: "boss",
    createdByCodename: "Velvet Otter",
    assignedTo: "me",
    assignedCodename: "Silent Falcon",
    createdAt: new Date(now - HOUR),
    deadline: new Date(now + 2 * HOUR),
    finalStatus: "active",
    ...overrides,
  }
}

const base = { loading: false, error: null, now }

describe("HeistList", () => {
  it("shows three card placeholders under one status while open heists load", () => {
    render(<HeistList view="active" heists={[]} {...base} loading />)
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getAllByTestId("heist-card-skeleton")).toHaveLength(3)
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("keeps the plain loading placeholder for expired heists", () => {
    render(<HeistList view="expired" heists={[]} {...base} loading />)
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByTestId("heist-card-skeleton")).not.toBeInTheDocument()
  })

  it("shows the error message when loading failed", () => {
    render(<HeistList view="active" heists={[]} {...base} error="Couldn't load these heists." />)
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load these heists.")
  })

  it("shows an empty message with a create link for open views", () => {
    render(<HeistList view="assigned" heists={[]} {...base} />)
    expect(screen.getByRole("link", { name: /create/i })).toHaveAttribute("href", "/heists/create")
  })

  it("shows an empty message without a create link for expired heists", () => {
    render(<HeistList view="expired" heists={[]} {...base} />)
    expect(screen.getByText(/no expired heists/i)).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("shows a card per active heist, linked to its page with who and time left", () => {
    render(<HeistList view="active" heists={[heist("h1"), heist("h2")]} {...base} />)
    expect(screen.getAllByRole("article")).toHaveLength(2)
    expect(screen.getByRole("link", { name: "Heist h1" })).toHaveAttribute("href", "/heists/h1")
    expect(screen.getAllByText("Velvet Otter")).toHaveLength(2)
    expect(screen.getAllByText("Silent Falcon")).toHaveLength(2)
    expect(screen.getAllByText("02:00:00")).toHaveLength(2)
  })

  it("shows assigned heists as cards too", () => {
    render(<HeistList view="assigned" heists={[heist("h1")]} {...base} />)
    expect(screen.getByRole("article")).toHaveTextContent("Silent Falcon")
  })

  it("shows both people and the outcome for expired heists", () => {
    const heists = [
      heist("won", { finalStatus: "success" }),
      heist("lost", { finalStatus: "failure" }),
      heist("late", { deadline: new Date(now - HOUR) }),
    ]
    const { container } = render(<HeistList view="expired" heists={heists} {...base} />)
    expect(screen.getAllByText("Velvet Otter → Silent Falcon")).toHaveLength(3)
    expect(screen.getByText("Success")).toBeInTheDocument()
    expect(screen.getByText("Failure")).toBeInTheDocument()
    expect(screen.getByText("Expired")).toBeInTheDocument()
    // no countdowns or cards for heists that are over
    expect(container.querySelector("time")).toBeNull()
    expect(screen.queryByRole("article")).not.toBeInTheDocument()
  })
})
