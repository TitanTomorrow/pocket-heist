import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockPush, mockLogIn, mockSignUp } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockLogIn: vi.fn(),
  mockSignUp: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock("@/components/UserProvider", () => ({
  useAuthActions: () => ({ logIn: mockLogIn, signUp: mockSignUp, logOut: vi.fn() }),
}))

// component imports
import AuthForm from "@/components/AuthForm"

// The field is focused, marked invalid and described by the error message
function expectFieldError(label: string, message: string) {
  const field = screen.getByLabelText(label)
  expect(field).toHaveFocus()
  expect(field).toBeInvalid()
  expect(field).toHaveAccessibleDescription(message)
}

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogIn.mockResolvedValue(undefined)
    mockSignUp.mockResolvedValue(undefined)
  })

  it("renders the login fields, button and signup link", () => {
    render(<AuthForm mode="login" />)
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.queryByLabelText("Code name")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup")
  })

  it("renders the code name, confirm field, button and login link in signup mode", () => {
    render(<AuthForm mode="signup" />)
    expect(screen.getByLabelText("Code name")).toBeInTheDocument()
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
    expect(mockLogIn).not.toHaveBeenCalled()
  })

  it("toggles both password fields in signup mode", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text")
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "text")
  })

  it("logs in with the trimmed, lowercased email and goes to /heists", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)
    await user.type(screen.getByLabelText("Email"), "  Name@Example.COM ")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Log in" }))
    expect(mockLogIn).toHaveBeenCalledWith("name@example.com", "secret1")
    expect(mockPush).toHaveBeenCalledWith("/heists")
  })

  it("shows an error and stays put when login fails", async () => {
    mockLogIn.mockRejectedValue({ code: "auth/invalid-credential" })
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "wrong1")
    await user.click(screen.getByRole("button", { name: "Log in" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("marks both fields invalid and focuses the email when the credentials are wrong", async () => {
    mockLogIn.mockRejectedValue({ code: "auth/invalid-credential" })
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "wrong1")
    await user.click(screen.getByRole("button", { name: "Log in" }))
    await screen.findByRole("alert")
    const email = screen.getByLabelText("Email")
    expect(email).toHaveFocus()
    expect(email).toBeInvalid()
    expect(email).toHaveAccessibleDescription("Incorrect email or password")
    expect(screen.getByLabelText("Password")).toBeInvalid()
  })

  it("leaves the fields valid for an error that isn't about them", async () => {
    mockLogIn.mockRejectedValue({ code: "auth/network-request-failed" })
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Log in" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Network error")
    expect(screen.getByLabelText("Email")).toBeValid()
    expect(screen.getByLabelText("Password")).toBeValid()
  })

  it("says it's logging in while waiting, so the disabled button isn't a mystery", async () => {
    mockLogIn.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Log in" }))
    expect(screen.getByRole("button", { name: "Logging in…" })).toBeDisabled()
  })

  it("says it's signing up while waiting", async () => {
    mockSignUp.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Code name"), "Silent Falcon")
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(screen.getByRole("button", { name: "Signing up…" })).toBeDisabled()
  })

  it("blocks signup when the code name is blank", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Code name"), "   ")
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a code name")
    expectFieldError("Code name", "Please enter a code name")
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("blocks signup when the code name is longer than 30 characters", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Code name"), "x".repeat(31))
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Code name must be 30 characters or fewer")
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("blocks signup when the passwords do not match", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Code name"), "Silent Falcon")
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret2")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match")
    expectFieldError("Confirm password", "Passwords do not match")
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("blocks signup when the password is shorter than 6 characters", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Code name"), "Silent Falcon")
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "abc12")
    await user.type(screen.getByLabelText("Confirm password"), "abc12")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expectFieldError("Password", "Password must be at least 6 characters")
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("signs up with the trimmed code name and goes to /heists", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Code name"), "  Silent Falcon ")
    await user.type(screen.getByLabelText("Email"), "A@B.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(mockSignUp).toHaveBeenCalledWith("a@b.com", "secret1", "Silent Falcon")
    expect(mockPush).toHaveBeenCalledWith("/heists")
  })

  it("shows an error when the email is already registered", async () => {
    mockSignUp.mockRejectedValue({ code: "auth/email-already-in-use" })
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Code name"), "Silent Falcon")
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with this email already exists",
    )
    expectFieldError("Email", "An account with this email already exists")
    expect(mockPush).not.toHaveBeenCalled()
  })
})
