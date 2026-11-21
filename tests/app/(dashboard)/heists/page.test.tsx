import { render, screen, within } from "@testing-library/react"
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

// The section a heading belongs to
const section = (name: string) => screen.getByRole("heading", { level: 2, name }).parentElement!

function heist(id: string, overrides: Partial<Heist> = {}): Heist {
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
    ...overrides,
  }
}

const ready = (heists: Heist[]): HeistsResult => ({ heists, loading: false, error: null, now })

describe("HeistsPage", () => {
  beforeEach(() => {
    m.results = { active: ready([]), assigned: ready([]), expired: ready([]) }
  })

  it("has a single page heading above the sections", () => {
    render(<HeistsPage />)
    expect(screen.getByRole("heading", { level: 1, name: "Your Heists" })).toBeInTheDocument()
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
    expect(within(section("Your Active Heists")).getAllByTestId("heist-card-skeleton")).toHaveLength(3)
    expect(within(section("Heists You've Assigned")).getAllByTestId("heist-card-skeleton")).toHaveLength(3)
    expect(within(section("Your Expired Heists")).queryByTestId("heist-card-skeleton")).not.toBeInTheDocument()
  })

  it("fills each section from its own view", () => {
    m.results = { active: ready([heist("a")]), assigned: ready([heist("b")]), expired: ready([]) }
    render(<HeistsPage />)
    expect(screen.getByRole("link", { name: "Heist a" })).toHaveAttribute("href", "/heists/a")
    expect(screen.getByRole("link", { name: "Heist b" })).toHaveAttribute("href", "/heists/b")
    expect(screen.getByText(/no expired heists/i)).toBeInTheDocument()
  })

  it("shows active and assigned heists as cards, but not expired ones", () => {
    const expired = heist("c", { finalStatus: "success" })
    m.results = { active: ready([heist("a")]), assigned: ready([heist("b")]), expired: ready([expired]) }
    render(<HeistsPage />)
    expect(within(section("Your Active Heists")).getAllByRole("article")).toHaveLength(1)
    expect(within(section("Heists You've Assigned")).getAllByRole("article")).toHaveLength(1)
    const expiredSection = within(section("Your Expired Heists"))
    expect(expiredSection.getByText("Success")).toBeInTheDocument()
    expect(expiredSection.queryByRole("article")).not.toBeInTheDocument()
  })

  it("keeps the other sections working when one fails", () => {
    m.results.assigned = { heists: [], loading: false, error: "Couldn't load these heists.", now }
    m.results.active = ready([heist("a")])
    render(<HeistsPage />)
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load these heists.")
    expect(screen.getByRole("link", { name: "Heist a" })).toBeInTheDocument()
  })
})
