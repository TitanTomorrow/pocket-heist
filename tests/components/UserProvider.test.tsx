import { act, render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

type FakeFirebaseUser = { uid: string, email: string | null, displayName: string | null }

const m = vi.hoisted(() => ({
  authCallback: null as null | ((user: FakeFirebaseUser | null) => void),
  unsubscribe: vi.fn(),
  createUser: vi.fn(),
  updateProfile: vi.fn(),
  deleteUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  setDoc: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({ auth: { name: "test-auth" }, db: { name: "test-db" } }))

vi.mock("firebase/firestore", () => ({
  doc: (db: unknown, ...path: string[]) => ({ db, path }),
  setDoc: m.setDoc,
}))

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, callback: (user: FakeFirebaseUser | null) => void) => {
    m.authCallback = callback
    return m.unsubscribe
  },
  createUserWithEmailAndPassword: m.createUser,
  updateProfile: m.updateProfile,
  deleteUser: m.deleteUser,
  signInWithEmailAndPassword: m.signIn,
  signOut: m.signOut,
}))

// component imports
import UserProvider, { useUser, useAuthActions } from "@/components/UserProvider"

type Actions = ReturnType<typeof useAuthActions>

function ShowUser() {
  const user = useUser()
  let text = "signed out"
  if (user === undefined) text = "unknown"
  else if (user) text = `${user.displayName ?? "no code name"} (${user.email})`
  return <p>{text}</p>
}

// Reports every user value it renders with, plus the auth actions
function Recorder({ onRender }: { onRender: (user: unknown, actions: Actions) => void }) {
  onRender(useUser(), useAuthActions())
  return null
}

function renderWithProvider() {
  const seen: unknown[] = []
  let latestActions: Actions | undefined

  const view = render(
    <UserProvider>
      <ShowUser />
      <Recorder
        onRender={(user, actions) => {
          seen.push(user)
          latestActions = actions
        }}
      />
    </UserProvider>,
  )
  return { ...view, seen, actions: () => latestActions! }
}

describe("UserProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.authCallback = null
    m.setDoc.mockResolvedValue(undefined)
  })

  it("starts as unknown, then becomes signed out or the user", () => {
    renderWithProvider()
    expect(screen.getByText("unknown")).toBeInTheDocument()

    act(() => m.authCallback!(null))
    expect(screen.getByText("signed out")).toBeInTheDocument()

    act(() => m.authCallback!({ uid: "u1", email: "a@b.com", displayName: "Silent Falcon" }))
    expect(screen.getByText("Silent Falcon (a@b.com)")).toBeInTheDocument()

    act(() => m.authCallback!(null))
    expect(screen.getByText("signed out")).toBeInTheDocument()
  })

  it("returns a plain { uid, email, displayName } object", () => {
    const { seen } = renderWithProvider()
    act(() => m.authCallback!({ uid: "u1", email: "a@b.com", displayName: "Silent Falcon" }))
    expect(seen.at(-1)).toEqual({ uid: "u1", email: "a@b.com", displayName: "Silent Falcon" })
  })

  it("unsubscribes from Firebase on unmount", () => {
    const { unmount } = renderWithProvider()
    unmount()
    expect(m.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("throws a clear error when useUser is used outside the provider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<ShowUser />)).toThrow("useUser must be used inside <UserProvider>")
    errorSpy.mockRestore()
  })

  it("signs up and only publishes the user once the code name is saved", async () => {
    const firebaseUser: FakeFirebaseUser = { uid: "u1", email: "a@b.com", displayName: null }
    m.createUser.mockImplementation(async () => {
      // Firebase reports the new user before the code name is saved
      m.authCallback!(firebaseUser)
      return { user: firebaseUser }
    })
    m.updateProfile.mockImplementation(async (user: FakeFirebaseUser, profile: { displayName: string }) => {
      user.displayName = profile.displayName
    })

    const { seen, actions } = renderWithProvider()
    act(() => m.authCallback!(null))

    await act(() => actions().signUp("a@b.com", "secret1", "Silent Falcon"))

    expect(m.createUser).toHaveBeenCalledWith({ name: "test-auth" }, "a@b.com", "secret1")
    expect(m.updateProfile).toHaveBeenCalledWith(firebaseUser, { displayName: "Silent Falcon" })
    expect(m.setDoc).toHaveBeenCalledWith(
      { db: { name: "test-db" }, path: ["users", "u1"] },
      { codeName: "Silent Falcon" },
    )
    expect(screen.getByText("Silent Falcon (a@b.com)")).toBeInTheDocument()
    expect(seen).not.toContainEqual(expect.objectContaining({ displayName: null }))
  })

  it("deletes the new account and rejects when the code name can't be saved", async () => {
    const firebaseUser: FakeFirebaseUser = { uid: "u1", email: "a@b.com", displayName: null }
    m.createUser.mockImplementation(async () => {
      m.authCallback!(firebaseUser)
      return { user: firebaseUser }
    })
    m.updateProfile.mockRejectedValue({ code: "auth/network-request-failed" })
    m.deleteUser.mockImplementation(async () => {
      m.authCallback!(null)
    })

    const { seen, actions } = renderWithProvider()
    act(() => m.authCallback!(null))

    // Catch inside act so the whole signup, including the rollback, finishes first
    let error: unknown
    await act(async () => {
      try {
        await actions().signUp("a@b.com", "secret1", "Silent Falcon")
      } catch (err) {
        error = err
      }
    })

    expect(error).toEqual({ code: "auth/network-request-failed" })
    expect(m.deleteUser).toHaveBeenCalledWith(firebaseUser)
    expect(screen.getByText("signed out")).toBeInTheDocument()
    expect(seen).not.toContainEqual(expect.objectContaining({ uid: "u1" }))
  })

  it("deletes the new account and rejects when the code name doc can't be saved", async () => {
    const firebaseUser: FakeFirebaseUser = { uid: "u1", email: "a@b.com", displayName: null }
    m.createUser.mockImplementation(async () => {
      m.authCallback!(firebaseUser)
      return { user: firebaseUser }
    })
    m.updateProfile.mockImplementation(async (user: FakeFirebaseUser, profile: { displayName: string }) => {
      user.displayName = profile.displayName
    })
    m.setDoc.mockRejectedValue({ code: "permission-denied" })
    m.deleteUser.mockImplementation(async () => {
      m.authCallback!(null)
    })

    const { seen, actions } = renderWithProvider()
    act(() => m.authCallback!(null))

    let error: unknown
    await act(async () => {
      try {
        await actions().signUp("a@b.com", "secret1", "Silent Falcon")
      } catch (err) {
        error = err
      }
    })

    expect(error).toEqual({ code: "permission-denied" })
    expect(m.deleteUser).toHaveBeenCalledWith(firebaseUser)
    expect(screen.getByText("signed out")).toBeInTheDocument()
    expect(seen).not.toContainEqual(expect.objectContaining({ uid: "u1" }))
  })

  it("logs in and logs out through Firebase", async () => {
    m.signIn.mockResolvedValue({})
    m.signOut.mockResolvedValue(undefined)
    const { actions } = renderWithProvider()

    await act(() => actions().logIn("a@b.com", "secret1"))
    expect(m.signIn).toHaveBeenCalledWith({ name: "test-auth" }, "a@b.com", "secret1")

    await act(() => actions().logOut())
    expect(m.signOut).toHaveBeenCalledWith({ name: "test-auth" })
  })
})
