import { randomHeistDeadline } from "@/lib/heists"

const HOUR = 60 * 60 * 1000
const createdAt = new Date("2026-11-18T12:00:00Z")

describe("randomHeistDeadline", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("is 24 hours after creation at the bottom of the range", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    expect(randomHeistDeadline(createdAt).getTime()).toBe(createdAt.getTime() + 24 * HOUR)
  })

  it("approaches 72 hours after creation at the top of the range", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999)
    const hours = (randomHeistDeadline(createdAt).getTime() - createdAt.getTime()) / HOUR
    expect(hours).toBeGreaterThan(71.99)
    expect(hours).toBeLessThanOrEqual(72)
  })

  it("always falls between 24 and 72 hours after creation", () => {
    for (let i = 0; i < 1000; i++) {
      const hours = (randomHeistDeadline(createdAt).getTime() - createdAt.getTime()) / HOUR
      expect(hours).toBeGreaterThanOrEqual(24)
      expect(hours).toBeLessThanOrEqual(72)
    }
  })

  it("defaults to the current time", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    const before = Date.now()
    const deadline = randomHeistDeadline().getTime()
    expect(deadline).toBeGreaterThanOrEqual(before + 24 * HOUR)
    expect(deadline).toBeLessThanOrEqual(Date.now() + 24 * HOUR)
  })
})
