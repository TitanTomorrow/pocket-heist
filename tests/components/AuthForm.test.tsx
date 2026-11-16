import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import AuthForm from "@/components/AuthForm"

describe("AuthForm", () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it("renders the login fields, button and signup link", () => {
    render(<AuthForm mode="login" />)
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup")
  })

  it("renders the confirm field, button and login link in signup mode", () => {
    render(<AuthForm mode="signup" />)
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login")
  })

  it("toggles password visibility without submitting", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)
    const password = screen.getByLabelText("Password")
    expect(password).toHaveAttribute("type", "password")

    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(password).toHaveAttribute("type", "text")

    await user.click(screen.getByRole("button", { name: "Hide password" }))
    expect(password).toHaveAttribute("type", "password")
    expect(logSpy).not.toHaveBeenCalled()
  })

  it("toggles both password fields in signup mode", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text")
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "text")
  })

  it("logs the trimmed, lowercased email and password on login", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)
    await user.type(screen.getByLabelText("Email"), "  Name@Example.COM ")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Log in" }))
    expect(logSpy).toHaveBeenCalledWith({
      mode: "login",
      email: "name@example.com",
      password: "secret1",
    })
  })

  it("blocks signup when the passwords do not match", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret2")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match")
    expect(logSpy).not.toHaveBeenCalled()
  })

  it("blocks signup when the password is shorter than 6 characters", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "abc12")
    await user.type(screen.getByLabelText("Confirm password"), "abc12")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(logSpy).not.toHaveBeenCalled()
  })

  it("logs and clears the fields after a valid signup", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(logSpy).toHaveBeenCalledWith({
      mode: "signup",
      email: "a@b.com",
      password: "secret1",
    })
    expect(screen.getByLabelText("Email")).toHaveValue("")
    expect(screen.getByLabelText("Password")).toHaveValue("")
    expect(screen.getByLabelText("Confirm password")).toHaveValue("")
  })
})
