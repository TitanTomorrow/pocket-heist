import Link from "next/link"
import Countdown from "@/components/Countdown"
import Skeleton from "@/components/Skeleton"
import { heistOutcome } from "@/lib/heists"
import type { HeistView } from "@/hooks/useHeists"
import type { Heist } from "@/types/firestore"
import styles from "./HeistList.module.css"

interface HeistListProps {
  view: HeistView
  heists: Heist[]
  loading: boolean
  error: string | null
  now: number // when the heists were checked against the clock, in ms; seeds each countdown
}

const EMPTY_MESSAGES: Record<HeistView, string> = {
  active: "No active heists. Time to cause some trouble.",
  assigned: "You haven't assigned any open heists.",
  expired: "No expired heists yet.",
}

const OUTCOME_STYLES = {
  Success: styles.success,
  Failure: styles.failure,
  Expired: styles.expired,
}

// Who else is involved: who set an active heist, who an assigned one went
// to, and both for an expired one
function people(view: HeistView, heist: Heist) {
  if (view === "active") return `From ${heist.createdByCodename}`
  if (view === "assigned") return `To ${heist.assignedCodename}`
  return `${heist.createdByCodename} → ${heist.assignedCodename}`
}

// One dashboard section's heists, with its loading, error and empty states
export default function HeistList({ view, heists, loading, error, now }: HeistListProps) {
  if (loading) return <Skeleton />

  if (error) return <p className={styles.error} role="alert">{error}</p>

  if (heists.length === 0) {
    return (
      <p className={styles.empty}>
        {EMPTY_MESSAGES[view]}
        {view !== "expired" && (
          <>
            {" "}
            <Link href="/heists/create" className={styles.createLink}>Create a heist</Link>
          </>
        )}
      </p>
    )
  }

  return (
    <ul className={styles.list}>
      {heists.map((heist) => {
        const outcome = view === "expired" ? heistOutcome(heist) : null
        return (
          <li key={heist.id} className={styles.item}>
            <div className={styles.details}>
              <Link href={`/heists/${heist.id}`} className={styles.title}>{heist.title}</Link>
              <span className={styles.people}>{people(view, heist)}</span>
            </div>
            {outcome ? (
              <span className={`${styles.outcome} ${OUTCOME_STYLES[outcome]}`}>{outcome}</span>
            ) : (
              <Countdown seconds={(heist.deadline.getTime() - now) / 1000} className={styles.time} />
            )}
          </li>
        )
      })}
    </ul>
  )
}
