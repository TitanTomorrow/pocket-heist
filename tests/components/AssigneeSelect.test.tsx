import { createRef } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

const m = vi.hoisted(() => ({
  listCrew: vi.fn(),
}))

vi.mock("@/lib/users", () => ({
  listCrew: m.listCrew,
}))

// component imports
import AssigneeSelect from "@/components/AssigneeSelect"

const crew = [
  { uid: "u3", codeName: "Ash Badger" },
  { uid: "me", codeName: "Me Myself" },
  { uid: "u1", codeName: "Silent Falcon" },
]

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe("AssigneeSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows a validation error, linked to the select and announced", async () => {
    m.listCrew.mockResolvedValue(crew)
    render(<AssigneeSelect id="a" value="" onChange={vi.fn()} exclude={[]} error="Choose a crew member" />)
    const select = screen.getByLabelText("Assign to")
    // aria-invalid rather than toBeInvalid: an empty required select is natively invalid anyway
    expect(select).toHaveAttribute("aria-invalid", "true")
    expect(select).toHaveAccessibleDescription("Choose a crew member")
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a crew member")
    await screen.findByRole("option", { name: "Ash Badger" })
  })

  it("passes its ref to the select, so a form can focus it", async () => {
    m.listCrew.mockResolvedValue(crew)
    const ref = createRef<HTMLSelectElement>()
    render(<AssigneeSelect id="a" value="" onChange={vi.fn()} exclude={[]} ref={ref} />)
    expect(ref.current).toBe(screen.getByLabelText("Assign to"))
    await screen.findByRole("option", { name: "Ash Badger" })
  })

  it("shows a disabled loading state while the crew loads", () => {
    m.listCrew.mockReturnValue(new Promise(() => {}))
    render(<AssigneeSelect id="a" value="" onChange={vi.fn()} exclude={[]} />)
    const select = screen.getByLabelText("Assign to")
    expect(select).toBeDisabled()
    expect(within(select).getByRole("option", { name: "Loading crew…" })).toBeInTheDocument()
  })

  it("lists crew members by code name, leaving out excluded users", async () => {
    m.listCrew.mockResolvedValue(crew)
    render(<AssigneeSelect id="a" value="" onChange={vi.fn()} exclude={["me"]} />)
    expect(await screen.findByRole("option", { name: "Ash Badger" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Silent Falcon" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Me Myself" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Assign to")).toBeEnabled()
  })

  it("reports the chosen crew member", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    m.listCrew.mockResolvedValue(crew)
    render(<AssigneeSelect id="a" value="" onChange={onChange} exclude={[]} />)
    await screen.findByRole("option", { name: "Silent Falcon" })
    await user.selectOptions(screen.getByLabelText("Assign to"), "u1")
    expect(onChange).toHaveBeenCalledWith({ uid: "u1", codeName: "Silent Falcon" })
  })

  it("keeps users who share a code name as separate options", async () => {
    m.listCrew.mockResolvedValue([
      { uid: "g1", codeName: "Ghost" },
      { uid: "g2", codeName: "Ghost" },
    ])
    render(<AssigneeSelect id="a" value="" onChange={vi.fn()} exclude={[]} />)
    expect(await screen.findAllByRole("option", { name: "Ghost" })).toHaveLength(2)
  })

  it("says so when there is no one else to assign", async () => {
    m.listCrew.mockResolvedValue([{ uid: "me", codeName: "Me Myself" }])
    render(<AssigneeSelect id="a" value="" onChange={vi.fn()} exclude={["me"]} />)
    expect(await screen.findByRole("option", { name: "No one else has signed up yet" })).toBeInTheDocument()
    expect(screen.getByLabelText("Assign to")).toBeDisabled()
  })

  it("shows an error with a retry that reloads the crew", async () => {
    const user = userEvent.setup()
    m.listCrew.mockRejectedValueOnce(new Error("permission-denied"))
    render(<AssigneeSelect id="a" value="" onChange={vi.fn()} exclude={[]} />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the crew")
    expect(screen.getByLabelText("Assign to")).toBeDisabled()

    const retry = deferred<typeof crew>()
    m.listCrew.mockReturnValueOnce(retry.promise)
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    retry.resolve(crew)
    expect(await screen.findByRole("option", { name: "Ash Badger" })).toBeInTheDocument()
    expect(m.listCrew).toHaveBeenCalledTimes(2)
  })
})
