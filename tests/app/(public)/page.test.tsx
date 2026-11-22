import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}))

// signed out, so the splash stays put
vi.mock("@/components/UserProvider", () => ({
  useUser: () => null,
}))

// page imports
import Home from "@/app/(public)/page"

describe("Splash page", () => {
  it("shows a picture of a duck", () => {
    render(<Home />)
    const duck = screen.getByRole("img", { name: /duck/i })
    expect(duck).toHaveAttribute("src", expect.stringContaining("duck.svg"))
  })
})
