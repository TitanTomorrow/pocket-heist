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
  it("shows a loading placeholder while loading", () => {
    render(<HeistList view="active" heists={[]} {...base} loading />)
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
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

  it("links each heist to its page and shows who assigned it, with time left", () => {
    render(<HeistList view="active" heists={[heist("h1")]} {...base} />)
    expect(screen.getByRole("link", { name: "Heist h1" })).toHaveAttribute("href", "/heists/h1")
    expect(screen.getByText("From Velvet Otter")).toBeInTheDocument()
    expect(screen.getByText("02:00:00")).toBeInTheDocument()
  })

  it("shows who an assigned heist went to", () => {
    render(<HeistList view="assigned" heists={[heist("h1")]} {...base} />)
    expect(screen.getByText("To Silent Falcon")).toBeInTheDocument()
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
    // no countdowns for heists that are over
    expect(container.querySelector("time")).toBeNull()
  })
})
