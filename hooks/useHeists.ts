"use client"

import { useEffect, useMemo, useState } from "react"
import { onSnapshot, type FirestoreError } from "firebase/firestore"
import { useUser } from "@/components/UserProvider"
import {
  EXPIRED_HEISTS_LIMIT,
  isHeistOpen,
  pastHeistsQuery,
  upcomingHeistsQuery,
  type HeistRole,
} from "@/lib/heists"
import type { Heist } from "@/types/firestore"

// active: open heists assigned to the user. assigned: open heists the user
// created. expired: closed heists the user created or is assigned to
export type HeistView = "active" | "assigned" | "expired"

export interface HeistsResult {
  heists: Heist[]
  loading: boolean
  error: string | null
  now: number // when the heists were last checked against the clock, in ms
}

// What one subscription (one user and view) has received so far. null lists
// haven't had their first snapshot yet
interface Loaded {
  key: string
  upcoming: Heist[] | null
  past: Heist[] | null
  error: string | null
  now: number
}

const ROLES: Record<HeistView, HeistRole> = {
  active: "assignee",
  assigned: "creator",
  expired: "either",
}

const ERROR_MESSAGE = "Couldn't load these heists. Try refreshing the page."
const NO_HEISTS: Heist[] = []

// Client components only. A live list of the signed-in user's heists for one
// view; nothing here writes to Firestore. Deadlines pass without any document
// changing, so the heists are split into open and closed on the client, and a
// timer re-checks them when the next deadline passes
export function useHeists(view: HeistView): HeistsResult {
  const user = useUser()
  const uid = user?.uid
  const key = uid ? `${uid}:${view}` : null
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!uid) return
    const subscription = `${uid}:${view}`
    // Fixed for this subscription; everything after it comes from the
    // upcoming query, so the past query never needs to move it
    const since = new Date()
    let closed = false

    const update = (changes: Partial<Loaded>) => {
      if (closed) return
      setLoaded((prev) => ({
        ...(prev?.key === subscription
          ? prev
          : { key: subscription, upcoming: null, past: null, error: null, now: 0 }),
        ...changes,
        now: Date.now(),
      }))
    }
    const fail = (err: FirestoreError) => {
      // Keep the raw error for developers: a missing index error links to the fix
      console.error("useHeists: couldn't load heists", err)
      update({ error: ERROR_MESSAGE })
    }

    const unsubscribes = [
      onSnapshot(
        upcomingHeistsQuery(uid, ROLES[view], since),
        (snapshot) => update({ upcoming: snapshot.docs.map((d) => d.data()) }),
        fail,
      ),
    ]
    if (view === "expired") {
      unsubscribes.push(
        onSnapshot(
          pastHeistsQuery(uid, since),
          (snapshot) => update({ past: snapshot.docs.map((d) => d.data()) }),
          fail,
        ),
      )
    }

    return () => {
      closed = true
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [uid, view])

  // Ignore what's left over from a previous user or view
  const current = loaded && loaded.key === key ? loaded : null

  // Wake up just after the next open heist's deadline, so it moves from the
  // open lists to the expired one
  const upcoming = current?.upcoming
  const now = current?.now ?? 0
  useEffect(() => {
    if (!upcoming) return
    const next = upcoming.find((heist) => isHeistOpen(heist, new Date(now)))
    if (!next) return
    const timer = setTimeout(() => {
      setLoaded((prev) => (prev && prev.key === key ? { ...prev, now: Date.now() } : prev))
    }, next.deadline.getTime() - now + 50)
    return () => clearTimeout(timer)
  }, [upcoming, now, key])

  const heists = useMemo(() => {
    if (!current?.upcoming) return NO_HEISTS
    const at = new Date(current.now)
    if (view !== "expired") return current.upcoming.filter((heist) => isHeistOpen(heist, at))
    if (!current.past) return NO_HEISTS

    // The past query and heists that closed during the session can't overlap,
    // but de-duplicate by id anyway
    const byId = new Map<string, Heist>()
    for (const heist of current.past) byId.set(heist.id, heist)
    for (const heist of current.upcoming) {
      if (!isHeistOpen(heist, at)) byId.set(heist.id, heist)
    }
    return [...byId.values()]
      .sort((a, b) => b.deadline.getTime() - a.deadline.getTime())
      .slice(0, EXPIRED_HEISTS_LIMIT)
  }, [current, view])

  if (user === undefined) return { heists: NO_HEISTS, loading: true, error: null, now }
  if (!uid) return { heists: NO_HEISTS, loading: false, error: null, now }

  const error = current?.error ?? null
  const waiting = !current || current.upcoming === null || (view === "expired" && current.past === null)
  return { heists: error ? NO_HEISTS : heists, loading: !error && waiting, error, now }
}
