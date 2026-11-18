const m = vi.hoisted(() => ({
  getDocs: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({ db: { name: "test-db" } }))

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  getDocs: m.getDocs,
}))

import { listCrew } from "@/lib/users"

function snapshotOf(docs: { id: string, data: Record<string, unknown> }[]) {
  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })) }
}

describe("listCrew", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reads the users collection", async () => {
    m.getDocs.mockResolvedValue(snapshotOf([]))
    await listCrew()
    expect(m.getDocs).toHaveBeenCalledWith({ path: "users" })
  })

  it("returns each user's uid and code name, sorted alphabetically ignoring case", async () => {
    m.getDocs.mockResolvedValue(snapshotOf([
      { id: "u2", data: { codeName: "velvet Otter" } },
      { id: "u1", data: { codeName: "Silent Falcon" } },
      { id: "u3", data: { codeName: "Ash Badger" } },
    ]))
    expect(await listCrew()).toEqual([
      { uid: "u3", codeName: "Ash Badger" },
      { uid: "u1", codeName: "Silent Falcon" },
      { uid: "u2", codeName: "velvet Otter" },
    ])
  })

  it("skips users without a code name", async () => {
    m.getDocs.mockResolvedValue(snapshotOf([
      { id: "u1", data: { codeName: "Silent Falcon" } },
      { id: "u2", data: {} },
      { id: "u3", data: { codeName: 42 } },
    ]))
    expect(await listCrew()).toEqual([{ uid: "u1", codeName: "Silent Falcon" }])
  })

  it("keeps users who share a code name as separate entries", async () => {
    m.getDocs.mockResolvedValue(snapshotOf([
      { id: "u1", data: { codeName: "Ghost" } },
      { id: "u2", data: { codeName: "Ghost" } },
    ]))
    expect(await listCrew()).toHaveLength(2)
  })
})
