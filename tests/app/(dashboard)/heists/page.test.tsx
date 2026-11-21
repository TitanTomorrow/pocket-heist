import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { HeistsResult, HeistView } from "@/hooks/useHeists"
import type { Heist } from "@/types/firestore"

const now = new Date("2026-11-19T12:00:00Z").getTime()

const m = vi.hoisted(() => ({
  results: {} as Record<string, unknown>,
}))

vi.mock("@/hooks/useHeists", () => ({
  useHeists: (view: HeistView) => m.results[view],
}))

import HeistsPage from "@/app/(dashboard)/heists/page"

function heist(id: string): Heist {
  return {
    id,
    title: `Heist ${id}`,
    description: "d",
    createdBy: "boss",
    createdByCodename: "Velvet Otter",
    assignedTo: "me",
    assignedCodename: "Silent Falcon",
    createdAt: new Date(now - 1000),
    deadline: new Date(now + 60 * 60 * 1000),
    finalStatus: "active",
  }
}

const ready = (heists: Heist[]): HeistsResult => ({ heists, loading: false, error: null, now })

describe("HeistsPage", () => {
  beforeEach(() => {
    m.results = { active: ready([]), assigned: ready([]), expired: ready([]) }
  })

  it("shows the three sections", () => {
    render(<HeistsPage />)
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(["Your Active Heists", "Heists You've Assigned", "Your Expired Heists"])
  })

  it("shows a loading placeholder for each section still loading", () => {
    const loading = { heists: [], loading: true, error: null, now }
    m.results = { active: loading, assigned: loading, expired: loading }
    render(<HeistsPage />)
    expect(screen.getAllByRole("status")).toHaveLength(3)
  })

  it("fills each section from its own view", () => {
    m.results = { active: ready([heist("a")]), assigned: ready([heist("b")]), expired: ready([]) }
    render(<HeistsPage />)
    expect(screen.getByRole("link", { name: "Heist a" })).toHaveAttribute("href", "/heists/a")
    expect(screen.getByRole("link", { name: "Heist b" })).toHaveAttribute("href", "/heists/b")
    expect(screen.getByText(/no expired heists/i)).toBeInTheDocument()
  })

  it("keeps the other sections working when one fails", () => {
    m.results.assigned = { heists: [], loading: false, error: "Couldn't load these heists.", now }
    m.results.active = ready([heist("a")])
    render(<HeistsPage />)
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load these heists.")
    expect(screen.getByRole("link", { name: "Heist a" })).toBeInTheDocument()
  })
})
