import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const m = vi.hoisted(() => ({
  user: undefined as unknown,
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: m.replace }),
}))

vi.mock("@/components/UserProvider", () => ({
  useUser: () => m.user,
}))

// component imports
import AuthRedirect from "@/components/AuthRedirect"

const signedInUser = { uid: "u1", email: "a@b.com", displayName: "Silent Falcon" }

describe("AuthRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.user = undefined
  })

  it("does not redirect while auth state is unknown", () => {
    render(<AuthRedirect signedInTo="/heists" signedOutTo="/login" />)
    expect(m.replace).not.toHaveBeenCalled()
  })

  it("sends a signed-in user to signedInTo", () => {
    m.user = signedInUser
    render(<AuthRedirect signedInTo="/heists" signedOutTo="/login" />)
    expect(m.replace).toHaveBeenCalledWith("/heists")
  })

  it("sends a signed-out user to signedOutTo", () => {
    m.user = null
    render(<AuthRedirect signedInTo="/heists" signedOutTo="/login" />)
    expect(m.replace).toHaveBeenCalledWith("/login")
  })

  it("stays put when there is no target for the current state", () => {
    m.user = null
    render(<AuthRedirect signedInTo="/heists" />)
    expect(m.replace).not.toHaveBeenCalled()
  })
})
