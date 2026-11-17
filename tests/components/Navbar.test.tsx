import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

const m = vi.hoisted(() => ({
  user: undefined as unknown,
  replace: vi.fn(),
  logOut: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: m.replace }),
}))

vi.mock("@/components/UserProvider", () => ({
  useUser: () => m.user,
  useAuthActions: () => ({ logOut: m.logOut, logIn: vi.fn(), signUp: vi.fn() }),
}))

// component imports
import Navbar from "@/components/Navbar"

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.user = undefined
    m.logOut.mockResolvedValue(undefined)
  })

  it("renders the main heading", () => {
    render(<Navbar />)

    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it("renders the Create Heist link", () => {
    render(<Navbar />)

    const createLink = screen.getByRole("link", { name: /create heist/i })
    expect(createLink).toBeInTheDocument()
    expect(createLink).toHaveAttribute("href", "/heists/create")
  })

  it("shows no user details while auth state is unknown", () => {
    render(<Navbar />)
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument()
  })

  it("shows the code name and a logout button for a signed-in user", () => {
    m.user = { uid: "u1", email: "a@b.com", displayName: "Silent Falcon" }
    render(<Navbar />)
    expect(screen.getByText("Silent Falcon")).toBeInTheDocument()
    expect(screen.queryByText("a@b.com")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument()
  })

  it("falls back to the email when the user has no code name", () => {
    m.user = { uid: "u1", email: "a@b.com", displayName: null }
    render(<Navbar />)
    expect(screen.getByText("a@b.com")).toBeInTheDocument()
  })

  it("logs out and goes to /login", async () => {
    m.user = { uid: "u1", email: "a@b.com", displayName: "Silent Falcon" }
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByRole("button", { name: "Log out" }))
    expect(m.logOut).toHaveBeenCalledTimes(1)
    expect(m.replace).toHaveBeenCalledWith("/login")
  })

  it("stays put when logging out fails", async () => {
    m.user = { uid: "u1", email: "a@b.com", displayName: "Silent Falcon" }
    m.logOut.mockRejectedValue(new Error("network"))
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByRole("button", { name: "Log out" }))
    expect(m.replace).not.toHaveBeenCalled()
  })
})
