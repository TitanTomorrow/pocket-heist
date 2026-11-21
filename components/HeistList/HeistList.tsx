import Link from "next/link"
import HeistCard from "@/components/HeistCard"
import HeistCardSkeleton from "@/components/HeistCardSkeleton"
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

// Placeholders while open heists load: one row of the card grid
const SKELETON_CARDS = 3

// One dashboard section's heists, with its loading, error and empty states.
// Open heists (active and assigned) show as a grid of cards; expired heists
// as a plain list of outcomes
export default function HeistList({ view, heists, loading, error, now }: HeistListProps) {
  const expired = view === "expired"

  // Silent placeholders: the page announces loading once for all its lists
  if (loading) return expired ? <Skeleton decorative /> : <HeistCardSkeleton count={SKELETON_CARDS} />

  if (error) return <p className={styles.error} role="alert">{error}</p>

  if (heists.length === 0) {
    return (
      <p className={styles.empty}>
        {EMPTY_MESSAGES[view]}
        {!expired && (
          <>
            {" "}
            <Link href="/heists/create" className={styles.createLink}>Create a heist</Link>
          </>
        )}
      </p>
    )
  }

  if (!expired) {
    return (
      <ul className="heist-grid">
        {heists.map((heist) => (
          <li key={heist.id}>
            <HeistCard heist={heist} now={now} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className={styles.list}>
      {heists.map((heist) => {
        const outcome = heistOutcome(heist)
        return (
          <li key={heist.id} className={styles.item}>
            <div className={styles.details}>
              <Link href={`/heists/${heist.id}`} className={styles.title}>{heist.title}</Link>
              <span className={styles.people}>{`${heist.createdByCodename} → ${heist.assignedCodename}`}</span>
            </div>
            <span className={`${styles.outcome} ${OUTCOME_STYLES[outcome]}`}>{outcome}</span>
          </li>
        )
      })}
    </ul>
  )
}
