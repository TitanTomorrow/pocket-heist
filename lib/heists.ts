import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { CrewMember } from "@/lib/users"
import {
  COLLECTIONS,
  HEIST_MAX_DEADLINE_HOURS,
  HEIST_MIN_DEADLINE_HOURS,
  heistConverter,
  type CreateHeistInput,
  type Heist,
  type UpdateHeistInput,
} from "@/types/firestore"

const HOUR_MS = 60 * 60 * 1000

// Picks a random deadline between HEIST_MIN_DEADLINE_HOURS and
// HEIST_MAX_DEADLINE_HOURS after `from` (a new heist's creation time)
export function randomHeistDeadline(from: Date = new Date()): Date {
  const minMs = HEIST_MIN_DEADLINE_HOURS * HOUR_MS
  const maxMs = HEIST_MAX_DEADLINE_HOURS * HOUR_MS
  return new Date(from.getTime() + minMs + Math.random() * (maxMs - minMs))
}

interface NewHeist {
  title: string
  description: string
  creator: CrewMember
  assignee: CrewMember
}

// Adds an active heist with a random deadline; resolves to its id
export async function createHeist({ title, description, creator, assignee }: NewHeist): Promise<string> {
  const input: CreateHeistInput = {
    title,
    description,
    createdBy: creator.uid,
    createdByCodename: creator.codeName,
    assignedTo: assignee.uid,
    assignedCodename: assignee.codeName,
    createdAt: serverTimestamp(),
    deadline: randomHeistDeadline(),
    finalStatus: "active",
  }
  const ref = await addDoc(collection(db, COLLECTIONS.HEISTS), input)
  return ref.id
}

// The heist with this id, or null if there isn't one
export async function getHeist(id: string): Promise<Heist | null> {
  // A "/" would make this a path into a subcollection, which Firestore rejects
  if (!id || id.includes("/")) return null
  const snapshot = await getDoc(doc(db, COLLECTIONS.HEISTS, id).withConverter(heistConverter))
  return snapshot.exists() ? snapshot.data() : null
}

// Hands a heist to someone else; nothing but the assignee changes
export async function reassignHeist(id: string, assignee: CrewMember): Promise<void> {
  const changes: UpdateHeistInput = {
    assignedTo: assignee.uid,
    assignedCodename: assignee.codeName,
  }
  await updateDoc(doc(db, COLLECTIONS.HEISTS, id), { ...changes })
}

export type ReassignBlocker = "not-allowed" | "closed"

// Why `uid` can't reassign this heist, or null if they can. Mirrors the
// reassignment checks in firestore.rules, which have the final say
export function reassignBlocker(heist: Heist, uid: string, now: Date = new Date()): ReassignBlocker | null {
  if (uid !== heist.createdBy && uid !== heist.assignedTo) return "not-allowed"
  if (heist.finalStatus !== "active" || heist.deadline.getTime() <= now.getTime()) return "closed"
  return null
}
