import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

const m = vi.hoisted(() => ({
  user: undefined as unknown,
  push: vi.fn(),
  listCrew: vi.fn(),
  createHeist: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: m.push }),
}))

vi.mock("@/components/UserProvider", () => ({
  useUser: () => m.user,
}))

vi.mock("@/lib/users", () => ({
  listCrew: m.listCrew,
}))

vi.mock("@/lib/heists", () => ({
  createHeist: m.createHeist,
}))

// component imports
import CreateHeistForm from "@/components/CreateHeistForm"

const me = { uid: "me", email: "me@example.com", displayName: "Silent Falcon" }
const crew = [
  { uid: "me", codeName: "Silent Falcon" },
  { uid: "u2", codeName: "Velvet Otter" },
]

async function fillIn(user: ReturnType<typeof userEvent.setup>, title: string, description: string) {
  if (title) {
    await user.click(screen.getByLabelText("Title"))
    await user.paste(title)
  }
  if (description) {
    await user.click(screen.getByLabelText("Description"))
    await user.paste(description)
  }
  await screen.findByRole("option", { name: "Velvet Otter" })
  await user.selectOptions(screen.getByLabelText("Assign to"), "u2")
}

describe("CreateHeistForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.user = me
    m.listCrew.mockResolvedValue(crew)
    m.createHeist.mockResolvedValue("h1")
  })

  it("shows the fields, the deadline note and the create button", async () => {
    render(<CreateHeistForm />)
    expect(screen.getByLabelText("Title")).toBeInTheDocument()
    expect(screen.getByLabelText("Description")).toBeInTheDocument()
    expect(screen.getByLabelText("Assign to")).toBeInTheDocument()
    expect(screen.getByText(/between 24 and 72 hours/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create heist" })).toBeInTheDocument()
    await screen.findByRole("option", { name: "Velvet Otter" })
  })

  it("leaves the signed-in user out of the assignee list", async () => {
    render(<CreateHeistForm />)
    await screen.findByRole("option", { name: "Velvet Otter" })
    expect(screen.queryByRole("option", { name: "Silent Falcon" })).not.toBeInTheDocument()
  })

  // An enabled button that explains itself, rather than a disabled one keyboard users can't reach
  it("asks for an assignee when submitted without one", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await user.click(screen.getByLabelText("Title"))
    await user.paste("Title")
    await user.click(screen.getByLabelText("Description"))
    await user.paste("Description")
    await screen.findByRole("option", { name: "Velvet Otter" })
    const button = screen.getByRole("button", { name: "Create heist" })
    expect(button).toBeEnabled()
    await user.click(button)
    const select = screen.getByLabelText("Assign to")
    expect(select).toHaveFocus()
    expect(select).toHaveAccessibleDescription("Choose a crew member to assign this heist to")
    expect(m.createHeist).not.toHaveBeenCalled()
  })

  it("clears the assignee error once someone is chosen", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await screen.findByRole("option", { name: "Velvet Otter" })
    await user.click(screen.getByRole("button", { name: "Create heist" }))
    // aria-invalid rather than toBeInvalid: an empty required select is natively invalid anyway
    expect(screen.getByLabelText("Assign to")).toHaveAttribute("aria-invalid", "true")
    await user.selectOptions(screen.getByLabelText("Assign to"), "u2")
    expect(screen.getByLabelText("Assign to")).not.toHaveAttribute("aria-invalid", "true")
  })

  it("can't be submitted while signed out", async () => {
    m.user = null
    m.listCrew.mockRejectedValue(new Error("permission-denied"))
    render(<CreateHeistForm />)
    await screen.findByRole("alert")
    expect(screen.getByRole("button", { name: "Create heist" })).toBeDisabled()
  })

  it("blocks a blank title or description", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await fillIn(user, "   ", "  ")
    await user.click(screen.getByRole("button", { name: "Create heist" }))
    expect(screen.getByText("Please enter a title")).toBeInTheDocument()
    expect(screen.getByText("Please enter a description")).toBeInTheDocument()
    expect(m.createHeist).not.toHaveBeenCalled()
  })

  it("moves focus to the first invalid field so its error is announced", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await fillIn(user, "   ", "  ")
    await user.click(screen.getByRole("button", { name: "Create heist" }))
    const title = screen.getByLabelText("Title")
    expect(title).toHaveFocus()
    expect(title).toHaveAccessibleDescription("Please enter a title")
  })

  it("moves focus to the description when only it is invalid", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await fillIn(user, "Title", "  ")
    await user.click(screen.getByRole("button", { name: "Create heist" }))
    const description = screen.getByLabelText("Description")
    expect(description).toHaveFocus()
    expect(description).toHaveAccessibleDescription("Please enter a description")
  })

  it("announces the error when Enter is pressed in the already-focused title", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await fillIn(user, "Title", "Description")
    const title = screen.getByLabelText("Title")
    await user.clear(title)
    await user.type(title, "   {Enter}")
    expect(title).toHaveFocus()
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a title")
  })

  it("blocks a title over 60 characters or a description over 500", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await fillIn(user, "x".repeat(61), "y".repeat(501))
    await user.click(screen.getByRole("button", { name: "Create heist" }))
    expect(screen.getByText("Title must be 60 characters or fewer")).toBeInTheDocument()
    expect(screen.getByText("Description must be 500 characters or fewer")).toBeInTheDocument()
    expect(m.createHeist).not.toHaveBeenCalled()
  })

  it("saves the trimmed heist and goes to /heists", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await fillIn(user, "  The last glazed donut ", " Lift it.  ")
    await user.click(screen.getByRole("button", { name: "Create heist" }))
    expect(m.createHeist).toHaveBeenCalledWith({
      title: "The last glazed donut",
      description: "Lift it.",
      creator: { uid: "me", codeName: "Silent Falcon" },
      assignee: { uid: "u2", codeName: "Velvet Otter" },
    })
    expect(m.push).toHaveBeenCalledWith("/heists")
  })

  it("falls back to the creator's email when they have no code name", async () => {
    const user = userEvent.setup()
    m.user = { ...me, displayName: null }
    render(<CreateHeistForm />)
    await fillIn(user, "Title", "Description")
    await user.click(screen.getByRole("button", { name: "Create heist" }))
    expect(m.createHeist).toHaveBeenCalledWith(expect.objectContaining({
      creator: { uid: "me", codeName: "me@example.com" },
    }))
  })

  it("disables the button while saving so the heist is only created once", async () => {
    const user = userEvent.setup()
    m.createHeist.mockReturnValue(new Promise(() => {}))
    render(<CreateHeistForm />)
    await fillIn(user, "Title", "Description")
    const button = screen.getByRole("button", { name: "Create heist" })
    await user.click(button)
    expect(button).toBeDisabled()
    await user.click(button)
    expect(m.createHeist).toHaveBeenCalledTimes(1)
  })

  it("shows an error, keeps the entries and stays put when saving fails", async () => {
    const user = userEvent.setup()
    m.createHeist.mockRejectedValue(new Error("permission-denied"))
    render(<CreateHeistForm />)
    await fillIn(user, "Title", "Description")
    await user.click(screen.getByRole("button", { name: "Create heist" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the heist")
    expect(screen.getByLabelText("Title")).toHaveValue("Title")
    expect(screen.getByLabelText("Description")).toHaveValue("Description")
    expect(screen.getByLabelText("Assign to")).toHaveValue("u2")
    expect(screen.getByRole("button", { name: "Create heist" })).toBeEnabled()
    expect(m.push).not.toHaveBeenCalled()
  })
})
