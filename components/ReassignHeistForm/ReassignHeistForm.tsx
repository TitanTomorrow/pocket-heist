"use client"

import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AssigneeSelect from "@/components/AssigneeSelect"
import Countdown from "@/components/Countdown"
import Skeleton from "@/components/Skeleton"
import { useUser } from "@/components/UserProvider"
import { getHeist, reassignBlocker, reassignHeist } from "@/lib/heists"
import type { CrewMember } from "@/lib/users"
import type { Heist } from "@/types/firestore"
import styles from "./ReassignHeistForm.module.css"

interface ReassignHeistFormProps {
  heistId: string
}

type Loaded =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready", heist: Heist | null, loadedAt: number }

const BLOCKED_MESSAGES = {
  "not-allowed": "Only the heist's planner or its current assignee can reassign it.",
  closed: "This heist is over, so it can't be reassigned.",
}

// Hands an existing heist to someone else. The page checks who may do it to
// show the right message; firestore.rules makes the real decision on save
export default function ReassignHeistForm({ heistId }: ReassignHeistFormProps) {
  const user = useUser()
  const router = useRouter()

  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" })
  const [assignee, setAssignee] = useState<CrewMember | null>(null)
  const [assigneeError, setAssigneeError] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  // Set when the countdown runs out while the form is open
  const [timedOut, setTimedOut] = useState(false)
  const assigneeRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    let cancelled = false
    getHeist(heistId)
      .then((heist) => {
        if (!cancelled) setLoaded({ status: "ready", heist, loadedAt: Date.now() })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ status: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [heistId])

  if (loaded.status === "loading") return <Skeleton />

  if (loaded.status === "error") {
    return (
      <Message role="alert">
        Couldn&apos;t load this heist. Check your connection and try again.
      </Message>
    )
  }

  const { heist, loadedAt } = loaded
  if (!heist) return <Message>There&apos;s no heist with that id.</Message>

  // An alert when time runs out mid-edit, because the form vanishes under the user
  if (timedOut) return <Message role="alert">{BLOCKED_MESSAGES.closed}</Message>
  const blocker = user ? reassignBlocker(heist, user.uid, new Date(loadedAt)) : "not-allowed"
  if (blocker) return <Message>{BLOCKED_MESSAGES[blocker]}</Message>

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!heist || submitting) return
    // Checked here rather than by disabling the button, which keyboard and
    // screen reader users can't reach to find out what's missing
    if (!assignee) {
      flushSync(() => setAssigneeError("Choose a crew member to hand this heist to"))
      assigneeRef.current?.focus()
      return
    }

    setSubmitting(true)
    setError("")
    try {
      await reassignHeist(heist.id, assignee)
      router.push("/heists")
    } catch {
      setError("Couldn't reassign the heist. It may have just changed hands or run out of time. Try again")
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <article className={styles.heist}>
        <h3 className={styles.title}>{heist.title}</h3>
        <p className={styles.description}>{heist.description}</p>
        <dl className={styles.facts}>
          <div>
            <dt>Assigned to</dt>
            <dd>{heist.assignedCodename}</dd>
          </div>
          <div>
            <dt>Time left</dt>
            <dd>
              <Countdown
                seconds={(heist.deadline.getTime() - loadedAt) / 1000}
                onExpire={() => setTimedOut(true)}
              />
            </dd>
          </div>
        </dl>
      </article>

      <AssigneeSelect
        id="reassign-assignee"
        ref={assigneeRef}
        value={assignee?.uid ?? ""}
        onChange={(member) => {
          setAssignee(member)
          setAssigneeError("")
        }}
        exclude={[heist.assignedTo, user?.uid ?? ""]}
        error={assigneeError || undefined}
      />

      {error && <p role="alert" className={styles.error}>{error}</p>}

      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? "Reassigning…" : "Reassign heist"}
      </button>
    </form>
  )
}

function Message({ children, role }: { children: React.ReactNode, role?: "alert" }) {
  return (
    <div className={styles.message}>
      <p role={role}>{children}</p>
      <Link href="/heists" className={styles.link}>Back to heists</Link>
    </div>
  )
}
