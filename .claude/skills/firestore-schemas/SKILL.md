---
name: firestore-schemas
description: Conventions for Firestore types, converters and collection names in this project. Use when adding or changing a Firestore collection or document type, writing a converter, or reading/writing Firestore data with addDoc, setDoc, updateDoc, getDoc(s) or onSnapshot.
---

# File Location

All Firestore types live in `types/firestore/`: one file per entity (lowercase, singular, e.g. `heist.ts`), re-exported from `types/firestore/index.ts`. Import them as `@/types/firestore`.

`COLLECTIONS` (a runtime value) also lives in that barrel on purpose, so every collection name sits next to the types that describe it.

# Naming Conventions

- **Document:** `{Entity}`: what you read back. Includes `id`, uses `Date` for date fields
- **Create Input:** `Create{Entity}Input`: what you pass to `addDoc`. No `id`; `createdAt` is a `FieldValue` (`serverTimestamp()`)
- **Update Input:** `Update{Entity}Input`: what you pass to `updateDoc`. Every field optional; no `id` or `createdAt`
- **Converter:** `{entity}Converter` (camelCase, e.g. `heistConverter`)
- Don't name an entity `User`: it clashes with `User` from `firebase/auth`, which `UserProvider` already imports. The users collection's type is `UserProfile`.

# Type Patterns

```typescript
// types/firestore/heist.ts
import type { FieldValue } from "firebase/firestore"

// Document: what you read from Firestore (after conversion)
export interface Heist {
  id: string
  title: string
  createdAt: Date
  deadline: Date | null
}

// Create Input: what you pass to addDoc
export interface CreateHeistInput {
  title: string
  createdAt: FieldValue // serverTimestamp()
  deadline: Date | null
}

// Update Input: partial fields for updateDoc (no id, no createdAt)
export interface UpdateHeistInput {
  title?: string
  deadline?: Date | null
}
```

Firestore stores a JS `Date` as a `Timestamp` automatically on write, so inputs can use `Date` directly. Only reads need converting back (see below).

# Converter Pattern

Type the converter as `FirestoreDataConverter<{Entity}>` so `withConverter` and the write functions check against it.

```typescript
import type {
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore"

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
      createdAt: data.createdAt.toDate(),
      deadline: data.deadline?.toDate() ?? null,
    }
  },
}
```

Map every field explicitly in `fromFirestore`. Don't spread `snapshot.data()` and cast with `as {Entity}`: Firestore doesn't enforce a schema, and the cast hides missing or misnamed fields.

# Reading and Writing

```typescript
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { COLLECTIONS, heistConverter, type CreateHeistInput, type UpdateHeistInput } from "@/types/firestore"

// Reads: use the converted reference, so results come back as Heist
const heistsRef = collection(db, COLLECTIONS.HEISTS).withConverter(heistConverter)

// Create: the converted reference expects a full Heist (including id),
// so use the plain reference with a typed Create Input
const input: CreateHeistInput = { title, deadline, createdAt: serverTimestamp() }
await addDoc(collection(db, COLLECTIONS.HEISTS), input)

// Update: updateDoc ignores converters, so type the payload yourself
const changes: UpdateHeistInput = { deadline }
await updateDoc(doc(db, COLLECTIONS.HEISTS, id), { ...changes })
```

`setDoc` on a converted reference does run `toFirestore`, including with `{ merge: true }`.

# Barrel Export

```typescript
// types/firestore/index.ts
export * from "./heist"
export * from "./user"

export const COLLECTIONS = {
  HEISTS: "heists",
  USERS: "users",
} as const
```

# Existing Data

- `users/{uid}` holds `{ codeName: string }`, written by `UserProvider` at signup. Its type is `UserProfile` in `types/firestore/user.ts`. `UserProvider` currently writes it with a string path and no type; switch it to `COLLECTIONS.USERS` and `UserProfile` when touching that code.

# Security Rules

Every collection or path you add needs a matching rule in `firestore.rules`. Today only the development catch-all, which expires on 1 Jan 2027, covers new collections.

Heists live in the top-level `heists` collection. Their rule requires a `createdBy` field holding the creator's uid: set it on create, never change it, and only the creator can update or delete the heist. Include `createdBy: string` in `Heist` and `CreateHeistInput`, but not in `UpdateHeistInput`.
