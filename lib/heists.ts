import { HEIST_MAX_DEADLINE_HOURS, HEIST_MIN_DEADLINE_HOURS } from "@/types/firestore"

const HOUR_MS = 60 * 60 * 1000

// Picks a random deadline between HEIST_MIN_DEADLINE_HOURS and
// HEIST_MAX_DEADLINE_HOURS after `from` (a new heist's creation time)
export function randomHeistDeadline(from: Date = new Date()): Date {
  const minMs = HEIST_MIN_DEADLINE_HOURS * HOUR_MS
  const maxMs = HEIST_MAX_DEADLINE_HOURS * HOUR_MS
  return new Date(from.getTime() + minMs + Math.random() * (maxMs - minMs))
}
