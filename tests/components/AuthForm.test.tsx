import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockPush, mockSignIn, mockSignUp } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignIn: vi.fn(),
  mockSignUp: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock("@/lib/firebase", () => ({ auth: { name: "test-auth" } }))

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: mockSignIn,
  createUserWithEmailAndPassword: mockSignUp,
}))

// component imports
import AuthForm from "@/components/AuthForm"

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockResolvedValue({})
    mockSignUp.mockResolvedValue({})
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
    expect(mockSignIn).not.toHaveBeenCalled()
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
    expect(mockSignIn).toHaveBeenCalledWith({ name: "test-auth" }, "name@example.com", "secret1")
    expect(mockPush).toHaveBeenCalledWith("/heists")
  })

  it("shows an error and stays put when login fails", async () => {
    mockSignIn.mockRejectedValue({ code: "auth/invalid-credential" })
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "wrong1")
    await user.click(screen.getByRole("button", { name: "Log in" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("blocks signup when the passwords do not match", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret2")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match")
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("blocks signup when the password is shorter than 6 characters", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "abc12")
    await user.type(screen.getByLabelText("Confirm password"), "abc12")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("creates the account and goes to /heists after a valid signup", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Email"), "A@B.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(mockSignUp).toHaveBeenCalledWith({ name: "test-auth" }, "a@b.com", "secret1")
    expect(mockPush).toHaveBeenCalledWith("/heists")
  })

  it("shows an error when the email is already registered", async () => {
    mockSignUp.mockRejectedValue({ code: "auth/email-already-in-use" })
    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.type(screen.getByLabelText("Confirm password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Sign up" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with this email already exists",
    )
    expect(mockPush).not.toHaveBeenCalled()
  })
})
