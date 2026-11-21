import Link from "next/link"
import { Calendar, Clock, User } from "lucide-react"
import Countdown from "@/components/Countdown"
import type { Heist } from "@/types/firestore"
import styles from "./HeistCard.module.css"

interface HeistCardProps {
  heist: Heist
  now: number // when the heist was checked against the clock, in ms; seeds the countdown
}

// e.g. "Dec 5, 05:00 PM" in the viewer's timezone. Newer ICU versions put a
// narrow no-break space before AM/PM; a plain space keeps it the same everywhere
const DEADLINE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
})

function formatDeadline(date: Date) {
  return DEADLINE_FORMAT.format(date).replace(/\u202F/g, " ")
}

// One open heist: its title links to the heist's page
export default function HeistCard({ heist, now }: HeistCardProps) {
  const secondsLeft = (heist.deadline.getTime() - now) / 1000

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.heading}>
          <Link href={`/heists/${heist.id}`} className={styles.title}>{heist.title}</Link>
        </h3>
        <Clock size={16} className={styles.status} aria-hidden="true" />
      </div>

      <div className={styles.meta}>
        <p className={styles.row}>
          <User size={12} className={styles.icon} aria-hidden="true" />
          <span>To:</span>
          <span className={styles.to}>{heist.assignedCodename}</span>
        </p>
        <p className={styles.row}>
          <User size={12} className={styles.icon} aria-hidden="true" />
          <span>By:</span>
          <span className={styles.by}>{heist.createdByCodename}</span>
        </p>
        <p className={styles.row}>
          <Calendar size={12} className={styles.icon} aria-hidden="true" />
          <time dateTime={heist.deadline.toISOString()}>{formatDeadline(heist.deadline)}</time>
          <span aria-hidden="true">•</span>
          {secondsLeft <= 0 ? (
            <span className={styles.timeLeft}>Overdue</span>
          ) : (
            <Countdown seconds={secondsLeft} className={styles.timeLeft} />
          )}
        </p>
      </div>
    </article>
  )
}
