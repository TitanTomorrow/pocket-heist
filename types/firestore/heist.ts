import type {
  FieldValue,
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore"

export const HEIST_STATUSES = ["active", "success", "failure"] as const
export type HeistStatus = (typeof HEIST_STATUSES)[number]

// A heist's deadline is set at random (randomHeistDeadline in lib/heists.ts)
// to between these many hours after its creation, and never changes.
// firestore.rules enforces the same range, so keep the two in sync.
export const HEIST_MIN_DEADLINE_HOURS = 24
export const HEIST_MAX_DEADLINE_HOURS = 72

// Document: what you read from Firestore (after conversion)
export interface Heist {
  id: string
  title: string
  description: string
  createdBy: string // creator's uid
  createdByCodename: string
  assignedTo: string // assignee's uid
  assignedCodename: string
  createdAt: Date
  deadline: Date // 24-72 hours after createdAt
  finalStatus: HeistStatus
}

// Create Input: what you pass to addDoc
export interface CreateHeistInput {
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedCodename: string
  createdAt: FieldValue // serverTimestamp()
  deadline: Date // randomHeistDeadline()
  finalStatus: HeistStatus
}

// Update Input: partial fields for updateDoc. createdBy, createdByCodename
// and deadline never change after creation
export interface UpdateHeistInput {
  title?: string
  description?: string
  assignedTo?: string
  assignedCodename?: string
  finalStatus?: HeistStatus
}

export const heistConverter: FirestoreDataConverter<Heist> = {
  // id is the document's ID, never a stored field
  toFirestore: (heist: PartialWithFieldValue<Heist>) => {
    const data = { ...heist }
    delete data.id
    return data
  },

  fromFirestore: (snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Heist => {
    // Right after a write, a pending serverTimestamp() reads as null on local
    // snapshots; "estimate" returns the local time instead
    const data = snapshot.data({ ...options, serverTimestamps: "estimate" })
    return {
      id: snapshot.id,
      title: data.title,
      description: data.description,
      createdBy: data.createdBy,
      createdByCodename: data.createdByCodename,
      assignedTo: data.assignedTo,
      assignedCodename: data.assignedCodename,
      createdAt: data.createdAt.toDate(),
      deadline: data.deadline.toDate(),
      finalStatus: data.finalStatus,
    }
  },
}
