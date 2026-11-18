import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { COLLECTIONS } from "@/types/firestore"

// A user as offered in the assignee picker: users/{uid} holds { codeName }
export interface CrewMember {
  uid: string
  codeName: string
}

// Every user with a code name, sorted alphabetically ignoring case. Code names
// aren't unique, so two members can share one; each keeps its own uid
export async function listCrew(): Promise<CrewMember[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS))
  const crew: CrewMember[] = []
  for (const userDoc of snapshot.docs) {
    const { codeName } = userDoc.data()
    if (typeof codeName === "string") crew.push({ uid: userDoc.id, codeName })
  }
  return crew.sort((a, b) => a.codeName.localeCompare(b.codeName, undefined, { sensitivity: "base" }))
}
