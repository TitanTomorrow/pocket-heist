import { act, renderHook } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Heist } from "@/types/firestore"

interface Listener {
  query: { parts: unknown[] }
  next: (snapshot: { docs: { data: () => Heist }[] }) => void
  error: (err: Error) => void
  unsubscribe: ReturnType<typeof vi.fn>
}

const m = vi.hoisted(() => ({
  user: undefined as unknown,
  listeners: [] as Listener[],
  writes: { addDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn() },
}))

vi.mock("@/components/UserProvider", () => ({
  useUser: () => m.user,
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))

// Query parts come back as plain descriptors; onSnapshot records each listener
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path, withConverter: () => ({ path }) }),
  doc: () => ({}),
  query: (ref: unknown, ...parts: unknown[]) => ({ ref, parts }),
  where: (field: string, op: string, value: unknown) => ({ where: [field, op, value] }),
  and: (...filters: unknown[]) => ({ and: filters }),
  or: (...filters: unknown[]) => ({ or: filters }),
  orderBy: (field: string, dir = "asc") => ({ orderBy: [field, dir] }),
  limit: (n: number) => ({ limit: n }),
  serverTimestamp: () => "SERVER_TIMESTAMP",
  getDoc: vi.fn(),
  ...m.writes,
  onSnapshot: (query: Listener["query"], next: Listener["next"], error: Listener["error"]) => {
    const unsubscribe = vi.fn()
    m.listeners.push({ query, next, error, unsubscribe })
    return unsubscribe
  },
}))

import { useHeists, type HeistView } from "@/hooks/useHeists"

const HOUR = 60 * 60 * 1000
const me = { uid: "me", email: "me@example.com", displayName: "Silent Falcon" }

function heist(id: string, overrides: Partial<Heist> = {}): Heist {
  return {
    id,
    title: `Heist ${id}`,
    description: "d",
    createdBy: "boss",
    createdByCodename: "Velvet Otter",
    assignedTo: "me",
    assignedCodename: "Silent Falcon",
    createdAt: new Date(Date.now() - HOUR),
    deadline: new Date(Date.now() + 24 * HOUR),
    finalStatus: "active",
    ...overrides,
  }
}

function emit(listener: Listener, heists: Heist[]) {
  act(() => listener.next({ docs: heists.map((h) => ({ data: () => h })) }))
}

const ids = (heists: Heist[]) => heists.map((h) => h.id)

// The role filter of an upcoming or past query: the first part of its and()
function roleOf(listener: Listener) {
  return (listener.query.parts[0] as { and: unknown[] }).and[0]
}

describe("useHeists", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.user = me
    m.listeners = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("is loading until the first snapshot arrives, then returns its heists", () => {
    const { result } = renderHook(() => useHeists("active"))
    expect(result.current.loading).toBe(true)
    expect(result.current.heists).toEqual([])

    emit(m.listeners[0], [heist("a"), heist("b")])
    expect(result.current.loading).toBe(false)
    expect(ids(result.current.heists)).toEqual(["a", "b"])
  })

  it("updates the list from later snapshots", () => {
    const { result } = renderHook(() => useHeists("active"))
    emit(m.listeners[0], [heist("a"), heist("b")])
    emit(m.listeners[0], [heist("b"), heist("c")])
    expect(ids(result.current.heists)).toEqual(["b", "c"])
  })

  it("subscribes to the right heists for each view", () => {
    renderHook(() => useHeists("active"))
    renderHook(() => useHeists("assigned"))
    expect(m.listeners).toHaveLength(2)
    expect(roleOf(m.listeners[0])).toEqual({ where: ["assignedTo", "==", "me"] })
    expect(roleOf(m.listeners[1])).toEqual({ where: ["createdBy", "==", "me"] })

    m.listeners = []
    renderHook(() => useHeists("expired"))
    // upcoming and past heists the user created or is assigned to, never anyone else's
    expect(m.listeners).toHaveLength(2)
    const mine = { or: [{ where: ["createdBy", "==", "me"] }, { where: ["assignedTo", "==", "me"] }] }
    expect(roleOf(m.listeners[0])).toEqual(mine)
    expect(roleOf(m.listeners[1])).toEqual(mine)
    expect(m.listeners[1].query.parts).toContainEqual({ limit: 20 })
  })

  it("leaves closed heists out of the open lists", () => {
    const { result } = renderHook(() => useHeists("assigned"))
    emit(m.listeners[0], [heist("open"), heist("won", { finalStatus: "success" })])
    expect(ids(result.current.heists)).toEqual(["open"])
  })

  it("doesn't subscribe while the user is unknown or signed out", () => {
    m.user = undefined
    const unknown = renderHook(() => useHeists("active"))
    expect(unknown.result.current.loading).toBe(true)

    m.user = null
    const signedOut = renderHook(() => useHeists("active"))
    expect(signedOut.result.current).toMatchObject({ loading: false, heists: [], error: null })

    expect(m.listeners).toHaveLength(0)
  })

  it("returns an error and stops loading when the subscription fails", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderHook(() => useHeists("active"))

    act(() => m.listeners[0].error(new Error("missing index")))
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toMatch(/couldn't load/i)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useHeists("expired"))
    unmount()
    expect(m.listeners.every((l) => l.unsubscribe.mock.calls.length === 1)).toBe(true)
  })

  it("starts over when the view changes, without showing the previous view's heists", () => {
    const { result, rerender } = renderHook(({ view }) => useHeists(view), {
      initialProps: { view: "active" as HeistView },
    })
    emit(m.listeners[0], [heist("a")])

    rerender({ view: "assigned" })
    expect(m.listeners[0].unsubscribe).toHaveBeenCalledTimes(1)
    expect(result.current.loading).toBe(true)
    expect(result.current.heists).toEqual([])
    expect(m.listeners).toHaveLength(2)
  })

  it("unsubscribes when the user signs out", () => {
    const { result, rerender } = renderHook(() => useHeists("active"))
    m.user = null
    rerender()
    expect(m.listeners[0].unsubscribe).toHaveBeenCalledTimes(1)
    expect(result.current.heists).toEqual([])
  })

  it("moves a heist to expired when its deadline passes, with no new snapshot", () => {
    vi.useFakeTimers({ now: new Date("2026-11-19T12:00:00Z") })
    const soon = heist("soon", { deadline: new Date(Date.now() + 10_000) })

    const active = renderHook(() => useHeists("active"))
    emit(m.listeners[0], [soon])
    const expired = renderHook(() => useHeists("expired"))
    emit(m.listeners[1], [soon]) // upcoming
    emit(m.listeners[2], []) // past

    expect(ids(active.result.current.heists)).toEqual(["soon"])
    expect(expired.result.current.heists).toEqual([])

    act(() => {
      vi.advanceTimersByTime(10_100)
    })
    expect(active.result.current.heists).toEqual([])
    expect(ids(expired.result.current.heists)).toEqual(["soon"])
  })

  it("caps the expired list at 20, latest deadline first", () => {
    const past = Array.from({ length: 20 }, (_, i) =>
      heist(`p${i}`, { deadline: new Date(Date.now() - (i + 1) * HOUR) }),
    )
    const won = heist("won", { finalStatus: "success" }) // closed early, deadline still ahead
    const { result } = renderHook(() => useHeists("expired"))

    emit(m.listeners[0], [won, heist("open")])
    expect(result.current.loading).toBe(true) // still waiting for the past heists
    emit(m.listeners[1], past)

    expect(result.current.heists).toHaveLength(20)
    expect(result.current.heists[0].id).toBe("won")
    expect(result.current.heists[1].id).toBe("p0")
    expect(ids(result.current.heists)).not.toContain("open")
    expect(ids(result.current.heists)).not.toContain("p19")
  })

  it("never writes to Firestore", () => {
    renderHook(() => useHeists("expired"))
    emit(m.listeners[0], [heist("a", { deadline: new Date(Date.now() - HOUR) })])
    emit(m.listeners[1], [])
    for (const write of Object.values(m.writes)) expect(write).not.toHaveBeenCalled()
  })
})
