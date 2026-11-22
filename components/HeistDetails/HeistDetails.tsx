"use client"

import { useState } from "react"
import Countdown from "@/components/Countdown"
import { heistOutcome, isHeistOpen } from "@/lib/heists"
import type { Heist } from "@/types/firestore"
import styles from "./HeistDetails.module.css"

interface HeistDetailsProps {
  heist: Heist
  now: number // when the heist was checked against the clock, in ms; seeds the countdown
  headingLevel?: 1 | 2 | 3 // 1 on the heist's own page
}

// Everything about one heist: its title, who's on it, the details, and the
// time left (or, once it's over, how it ended)
export default function HeistDetails({ heist, now, headingLevel = 1 }: HeistDetailsProps) {
  // Set when the countdown runs out while the page is open
  const [timedOut, setTimedOut] = useState(false)
  const open = !timedOut && isHeistOpen(heist, new Date(now))
  const Heading = `h${headingLevel}` as const

  return (
    <article className={styles.details}>
      <Heading className={styles.title}>{heist.title}</Heading>

      <dl className={styles.facts}>
        <div>
          <dt>Assigned to</dt>
          <dd className={styles.to}>{heist.assignedCodename}</dd>
        </div>
        <div>
          <dt>Created by</dt>
          <dd className={styles.by}>{heist.createdByCodename}</dd>
        </div>
        {open ? (
          <div>
            <dt>Time left</dt>
            <dd>
              <Countdown
                seconds={(heist.deadline.getTime() - now) / 1000}
                className={styles.timeLeft}
                onExpire={() => setTimedOut(true)}
              />
            </dd>
          </div>
        ) : (
          <div>
            <dt>Outcome</dt>
            <dd>{heistOutcome(heist)}</dd>
          </div>
        )}
      </dl>

      <div className={styles.section}>
        <p className={styles.label}>Details</p>
        <p className={styles.description}>{heist.description}</p>
      </div>
    </article>
  )
}
