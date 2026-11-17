import { render, screen } from "@testing-library/react"
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
import RequireAuth from "@/components/RequireAuth"

function renderProtected() {
  return render(
    <RequireAuth>
      <p>Secret heist plans</p>
    </RequireAuth>,
  )
}

describe("RequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.user = undefined
  })

  it("shows the loading placeholder while auth state is unknown", () => {
    renderProtected()
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("Secret heist plans")).not.toBeInTheDocument()
    expect(m.replace).not.toHaveBeenCalled()
  })

  it("sends a signed-out user to /login without showing the content", () => {
    m.user = null
    renderProtected()
    expect(m.replace).toHaveBeenCalledWith("/login")
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("Secret heist plans")).not.toBeInTheDocument()
  })

  it("shows the content to a signed-in user", () => {
    m.user = { uid: "u1", email: "a@b.com", displayName: "Silent Falcon" }
    renderProtected()
    expect(screen.getByText("Secret heist plans")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(m.replace).not.toHaveBeenCalled()
  })
})
