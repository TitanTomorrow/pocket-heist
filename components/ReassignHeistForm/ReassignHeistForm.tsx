"use client"

import { useEffect, useState } from "react"
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
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

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

  const blocker = user ? reassignBlocker(heist, user.uid, new Date(loadedAt)) : "not-allowed"
  if (blocker) return <Message>{BLOCKED_MESSAGES[blocker]}</Message>

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!heist || !assignee || submitting) return

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
    <form className={styles.form} onSubmit={handleSubmit}>
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
              <Countdown seconds={(heist.deadline.getTime() - loadedAt) / 1000} />
            </dd>
          </div>
        </dl>
      </article>

      <AssigneeSelect
        id="reassign-assignee"
        value={assignee?.uid ?? ""}
        onChange={setAssignee}
        exclude={[heist.assignedTo, user?.uid ?? ""]}
      />

      {error && <p role="alert" className={styles.error}>{error}</p>}

      <button type="submit" className="btn" disabled={!assignee || submitting}>
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
