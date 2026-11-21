import Link from "next/link"
import { Calendar, Clock, User } from "lucide-react"
import Countdown from "@/components/Countdown"
import type { Heist } from "@/types/firestore"
import LocalDeadline from "./LocalDeadline"
import styles from "./HeistCard.module.css"

interface HeistCardProps {
  heist: Heist
  now: number // when the heist was checked against the clock, in ms; seeds the countdown
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
          <LocalDeadline date={heist.deadline} />
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
