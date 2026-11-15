import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import Avatar from "@/components/Avatar"

describe("Avatar", () => {
  it("renders with the name as its accessible label", () => {
    render(<Avatar name="alice" />)
    expect(screen.getByRole("img", { name: "alice" })).toBeInTheDocument()
  })

  it("shows the first letter of a plain name in uppercase", () => {
    render(<Avatar name="alice" />)
    expect(screen.getByRole("img")).toHaveTextContent(/^A$/)
  })

  it("shows the first two uppercase letters of a PascalCase name", () => {
    render(<Avatar name="JohnDoe" />)
    expect(screen.getByRole("img")).toHaveTextContent(/^JD$/)
  })
})
