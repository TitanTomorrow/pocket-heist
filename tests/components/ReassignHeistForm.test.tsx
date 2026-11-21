import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Heist } from "@/types/firestore"

const m = vi.hoisted(() => ({
  user: undefined as unknown,
  push: vi.fn(),
  listCrew: vi.fn(),
  getHeist: vi.fn(),
  reassignHeist: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: m.push }),
}))

vi.mock("@/components/UserProvider", () => ({
  useUser: () => m.user,
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))

vi.mock("@/lib/users", () => ({
  listCrew: m.listCrew,
}))

// keep the real reassignBlocker; replace the Firestore calls
vi.mock("@/lib/heists", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/heists")>()),
  getHeist: m.getHeist,
  reassignHeist: m.reassignHeist,
}))

// component imports
import ReassignHeistForm from "@/components/ReassignHeistForm"

const HOUR = 60 * 60 * 1000

function makeHeist(overrides: Partial<Heist> = {}): Heist {
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
    ...overrides,
  }
}

const crew = [
  { uid: "u3", codeName: "Ash Badger" },
  { uid: "creator", codeName: "Silent Falcon" },
  { uid: "assignee", codeName: "Velvet Otter" },
]

function signInAs(uid: string) {
  m.user = { uid, email: `${uid}@example.com`, displayName: uid }
}

describe("ReassignHeistForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInAs("creator")
    m.listCrew.mockResolvedValue(crew)
    m.getHeist.mockResolvedValue(makeHeist())
    m.reassignHeist.mockResolvedValue(undefined)
  })

  it("shows a loading placeholder while the heist loads", () => {
    m.getHeist.mockReturnValue(new Promise(() => {}))
    render(<ReassignHeistForm heistId="h1" />)
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(m.getHeist).toHaveBeenCalledWith("h1")
  })

  it("shows the heist read-only", async () => {
    render(<ReassignHeistForm heistId="h1" />)
    expect(await screen.findByText("The last glazed donut")).toBeInTheDocument()
    expect(screen.getByText("Lift it from the break room.")).toBeInTheDocument()
    expect(screen.getByText("Velvet Otter")).toBeInTheDocument()
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument()
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument()
  })

  it("offers everyone except the current assignee and the signed-in creator", async () => {
    render(<ReassignHeistForm heistId="h1" />)
    expect(await screen.findByRole("option", { name: "Ash Badger" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Velvet Otter" })).not.toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Silent Falcon" })).not.toBeInTheDocument()
  })

  it("lets the assignee hand the heist back to its creator", async () => {
    signInAs("assignee")
    render(<ReassignHeistForm heistId="h1" />)
    expect(await screen.findByRole("option", { name: "Silent Falcon" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Ash Badger" })).toBeInTheDocument()
  })

  it("reassigns the heist and goes to /heists", async () => {
    const user = userEvent.setup()
    render(<ReassignHeistForm heistId="h1" />)
    await screen.findByRole("option", { name: "Ash Badger" })
    await user.selectOptions(screen.getByLabelText("Assign to"), "u3")
    await user.click(screen.getByRole("button", { name: "Reassign heist" }))
    expect(m.reassignHeist).toHaveBeenCalledWith("h1", { uid: "u3", codeName: "Ash Badger" })
    expect(m.push).toHaveBeenCalledWith("/heists")
  })

  it("shows an error, keeps the choice and stays put when reassigning fails", async () => {
    const user = userEvent.setup()
    m.reassignHeist.mockRejectedValue(new Error("permission-denied"))
    render(<ReassignHeistForm heistId="h1" />)
    await screen.findByRole("option", { name: "Ash Badger" })
    await user.selectOptions(screen.getByLabelText("Assign to"), "u3")
    await user.click(screen.getByRole("button", { name: "Reassign heist" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reassign the heist")
    expect(screen.getByLabelText("Assign to")).toHaveValue("u3")
    expect(m.push).not.toHaveBeenCalled()
  })

  it("asks for a new assignee when submitted without one", async () => {
    const user = userEvent.setup()
    render(<ReassignHeistForm heistId="h1" />)
    await screen.findByRole("option", { name: "Ash Badger" })
    const button = screen.getByRole("button", { name: "Reassign heist" })
    expect(button).toBeEnabled()
    await user.click(button)
    const select = screen.getByLabelText("Assign to")
    expect(select).toHaveFocus()
    expect(select).toHaveAccessibleDescription("Choose a crew member to hand this heist to")
    expect(m.reassignHeist).not.toHaveBeenCalled()
  })

  it("closes the form when the heist runs out of time while it's open", async () => {
    // fake only the clock and intervals, so promises and findBy still run
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] })
    try {
      m.getHeist.mockResolvedValue(makeHeist({ deadline: new Date(Date.now() + 2000) }))
      render(<ReassignHeistForm heistId="h1" />)
      await screen.findByRole("option", { name: "Ash Badger" })
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(screen.getByRole("alert")).toHaveTextContent(/can't be reassigned/i)
      expect(screen.queryByLabelText("Assign to")).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it("says so when there is no heist with that id", async () => {
    m.getHeist.mockResolvedValue(null)
    render(<ReassignHeistForm heistId="nope" />)
    expect(await screen.findByText(/no heist/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to heists" })).toHaveAttribute("href", "/heists")
    expect(screen.queryByLabelText("Assign to")).not.toBeInTheDocument()
  })

  it("turns away anyone who is neither the creator nor the assignee", async () => {
    signInAs("someone-else")
    render(<ReassignHeistForm heistId="h1" />)
    expect(await screen.findByText(/only the heist's planner or its current assignee/i)).toBeInTheDocument()
    expect(screen.queryByLabelText("Assign to")).not.toBeInTheDocument()
  })

  it("won't reassign a finished heist", async () => {
    m.getHeist.mockResolvedValue(makeHeist({ finalStatus: "success" }))
    render(<ReassignHeistForm heistId="h1" />)
    expect(await screen.findByText(/can't be reassigned/i)).toBeInTheDocument()
    expect(screen.queryByLabelText("Assign to")).not.toBeInTheDocument()
  })

  it("won't reassign a heist past its deadline", async () => {
    m.getHeist.mockResolvedValue(makeHeist({ deadline: new Date(Date.now() - HOUR) }))
    render(<ReassignHeistForm heistId="h1" />)
    expect(await screen.findByText(/can't be reassigned/i)).toBeInTheDocument()
  })

  it("shows an error when the heist fails to load", async () => {
    m.getHeist.mockRejectedValue(new Error("unavailable"))
    render(<ReassignHeistForm heistId="h1" />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this heist")
  })
})
