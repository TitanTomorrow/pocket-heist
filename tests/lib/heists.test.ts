const m = vi.hoisted(() => ({
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({ db: { name: "test-db" } }))

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, ...path: string[]) => ({
    path: path.join("/"),
    withConverter: () => ({ path: path.join("/"), converted: true }),
  }),
  addDoc: m.addDoc,
  getDoc: m.getDoc,
  updateDoc: m.updateDoc,
  serverTimestamp: () => "SERVER_TIMESTAMP",
}))

import {
  createHeist,
  getHeist,
  randomHeistDeadline,
  reassignBlocker,
  reassignHeist,
} from "@/lib/heists"
import type { Heist } from "@/types/firestore"

const HOUR = 60 * 60 * 1000
const createdAt = new Date("2026-11-18T12:00:00Z")

describe("randomHeistDeadline", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("is 24 hours after creation at the bottom of the range", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    expect(randomHeistDeadline(createdAt).getTime()).toBe(createdAt.getTime() + 24 * HOUR)
  })

  it("approaches 72 hours after creation at the top of the range", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999)
    const hours = (randomHeistDeadline(createdAt).getTime() - createdAt.getTime()) / HOUR
    expect(hours).toBeGreaterThan(71.99)
    expect(hours).toBeLessThanOrEqual(72)
  })

  it("always falls between 24 and 72 hours after creation", () => {
    for (let i = 0; i < 1000; i++) {
      const hours = (randomHeistDeadline(createdAt).getTime() - createdAt.getTime()) / HOUR
      expect(hours).toBeGreaterThanOrEqual(24)
      expect(hours).toBeLessThanOrEqual(72)
    }
  })

  it("defaults to the current time", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    const before = Date.now()
    const deadline = randomHeistDeadline().getTime()
    expect(deadline).toBeGreaterThanOrEqual(before + 24 * HOUR)
    expect(deadline).toBeLessThanOrEqual(Date.now() + 24 * HOUR)
  })
})

describe("createHeist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.addDoc.mockResolvedValue({ id: "h1" })
  })

  it("adds one active heist with a server creation time and a 24-72 hour deadline", async () => {
    const before = Date.now()
    await createHeist({
      title: "The last glazed donut",
      description: "Lift it from the break room.",
      creator: { uid: "u1", codeName: "Silent Falcon" },
      assignee: { uid: "u2", codeName: "Velvet Otter" },
    })

    expect(m.addDoc).toHaveBeenCalledTimes(1)
    const [ref, input] = m.addDoc.mock.calls[0]
    expect(ref).toEqual({ path: "heists" })
    expect(input).toMatchObject({
      title: "The last glazed donut",
      description: "Lift it from the break room.",
      createdBy: "u1",
      createdByCodename: "Silent Falcon",
      assignedTo: "u2",
      assignedCodename: "Velvet Otter",
      createdAt: "SERVER_TIMESTAMP",
      finalStatus: "active",
    })
    const hours = (input.deadline.getTime() - before) / HOUR
    expect(hours).toBeGreaterThanOrEqual(24)
    expect(hours).toBeLessThanOrEqual(72.01)
  })

  it("returns the new heist's id", async () => {
    const id = await createHeist({
      title: "t",
      description: "d",
      creator: { uid: "u1", codeName: "A" },
      assignee: { uid: "u2", codeName: "B" },
    })
    expect(id).toBe("h1")
  })
})

describe("getHeist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the converted heist", async () => {
    const heist = { id: "h1", title: "t" }
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => heist })
    expect(await getHeist("h1")).toBe(heist)
    expect(m.getDoc).toHaveBeenCalledWith({ path: "heists/h1", converted: true })
  })

  it("returns null when there is no heist with that id", async () => {
    m.getDoc.mockResolvedValue({ exists: () => false, data: () => undefined })
    expect(await getHeist("missing")).toBeNull()
  })

  it("returns null for an id that can't be a heist id, without reading", async () => {
    expect(await getHeist("")).toBeNull()
    expect(await getHeist("a/b")).toBeNull()
    expect(m.getDoc).not.toHaveBeenCalled()
  })
})

describe("reassignHeist", () => {
  it("changes only the assignee and their code name", async () => {
    m.updateDoc.mockResolvedValue(undefined)
    await reassignHeist("h1", { uid: "u3", codeName: "Ash Badger" })
    expect(m.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "heists/h1" }),
      { assignedTo: "u3", assignedCodename: "Ash Badger" },
    )
  })
})

describe("reassignBlocker", () => {
  const now = new Date("2026-11-19T12:00:00Z")
  const heist: Heist = {
    id: "h1",
    title: "t",
    description: "d",
    createdBy: "creator",
    createdByCodename: "Silent Falcon",
    assignedTo: "assignee",
    assignedCodename: "Velvet Otter",
    createdAt: new Date("2026-11-19T00:00:00Z"),
    deadline: new Date("2026-11-20T12:00:00Z"),
    finalStatus: "active",
  }

  it("lets the creator or the current assignee reassign an active heist", () => {
    expect(reassignBlocker(heist, "creator", now)).toBeNull()
    expect(reassignBlocker(heist, "assignee", now)).toBeNull()
  })

  it("blocks anyone else", () => {
    expect(reassignBlocker(heist, "someone-else", now)).toBe("not-allowed")
  })

  it("blocks a heist that is no longer active", () => {
    expect(reassignBlocker({ ...heist, finalStatus: "success" }, "creator", now)).toBe("closed")
    expect(reassignBlocker({ ...heist, finalStatus: "failure" }, "assignee", now)).toBe("closed")
  })

  it("blocks a heist whose deadline has passed", () => {
    expect(reassignBlocker({ ...heist, deadline: now }, "creator", now)).toBe("closed")
  })
})
