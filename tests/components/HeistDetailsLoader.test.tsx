import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Heist } from "@/types/firestore"

const m = vi.hoisted(() => ({
  getHeist: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))

// keep the real helpers; replace the Firestore call
vi.mock("@/lib/heists", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/heists")>()),
  getHeist: m.getHeist,
}))

// component imports
import HeistDetailsLoader from "@/components/HeistDetailsLoader"

const HOUR = 60 * 60 * 1000

function makeHeist(): Heist {
  return {
    id: "h1",
    title: "The last glazed donut",
    description: "Lift it from the break room.",
    createdBy: "creator",
    createdByCodename: "Silent Falcon",
    assignedTo: "assignee",
    assignedCodename: "Velvet Otter",
    createdAt: new Date(Date.now() - HOUR),
    deadline: new Date(Date.now() + 30 * HOUR),
    finalStatus: "active",
  }
}

describe("HeistDetailsLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows a loading placeholder while the heist loads", () => {
    m.getHeist.mockReturnValue(new Promise(() => {}))
    render(<HeistDetailsLoader heistId="h1" />)
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(m.getHeist).toHaveBeenCalledWith("h1")
  })

  it("shows the heist once it loads", async () => {
    m.getHeist.mockResolvedValue(makeHeist())
    render(<HeistDetailsLoader heistId="h1" />)
    expect(await screen.findByRole("heading", { level: 1, name: "The last glazed donut" })).toBeInTheDocument()
    expect(screen.getByText("Lift it from the break room.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to heists" })).toHaveAttribute("href", "/heists")
  })

  it("says so when there's no heist with that id", async () => {
    m.getHeist.mockResolvedValue(null)
    render(<HeistDetailsLoader heistId="missing" />)
    expect(await screen.findByRole("heading", { level: 1, name: "Heist not found" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to heists" })).toBeInTheDocument()
  })

  it("shows an alert when the heist can't be loaded", async () => {
    m.getHeist.mockRejectedValue(new Error("offline"))
    render(<HeistDetailsLoader heistId="h1" />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this heist")
    expect(screen.getByRole("heading", { level: 1, name: "Heist details" })).toBeInTheDocument()
  })
})
