import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const m = vi.hoisted(() => ({
  user: undefined as unknown,
}))

// Navbar is stubbed so this test doesn't depend on its auth actions or links
vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock("@/components/UserProvider", () => ({
  useUser: () => m.user,
}))

// component imports
import DashboardLayout from "@/app/(dashboard)/layout"

function renderLayout() {
  return render(
    <DashboardLayout>
      <p>Heist plans</p>
    </DashboardLayout>,
  )
}

describe("Dashboard layout", () => {
  beforeEach(() => {
    m.user = undefined
  })

  it("renders the navbar, main, then one footer for a signed-in user", () => {
    m.user = { uid: "u1", email: "a@b.com", displayName: "Silent Falcon" }
    renderLayout()
    const main = screen.getByRole("main")
    const footers = screen.getAllByRole("contentinfo")

    expect(main).toHaveTextContent("Heist plans")
    expect(footers).toHaveLength(1)
    expect(screen.getByTestId("navbar").nextElementSibling).toBe(main)
    expect(main.nextElementSibling).toBe(footers[0])
  })

  it("still shows the footer while auth is loading", () => {
    renderLayout()
    const main = screen.getByRole("main")

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("Heist plans")).not.toBeInTheDocument()
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1)
    expect(main.nextElementSibling).toBe(screen.getByRole("contentinfo"))
  })
})
