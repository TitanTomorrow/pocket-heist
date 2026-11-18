// Splash page: logged-in users are sent on to /heists; everyone else stays
// here and can register or log in

import Link from "next/link"
import { Clock8 } from "lucide-react"
import AuthRedirect from "@/components/AuthRedirect"
import Countdown from "@/components/Countdown"
import { HEIST_MAX_DEADLINE_HOURS, HEIST_MIN_DEADLINE_HOURS } from "@/types/firestore"
import styles from "./page.module.css"

// 41:12:08, the example heist's time left when the page loads
const EXAMPLE_SECONDS_LEFT = 41 * 3600 + 12 * 60 + 8

export default function Home() {
  return (
    <div className={styles.splash}>
      <AuthRedirect signedInTo="/heists" />

      <div className={styles.pitch}>
        <p className={styles.logo}>
          P<Clock8 className="logo" strokeWidth={2.75} />cket Heist
        </p>

        <h1 className={styles.headline}>
          Pocket the stapler.
          <br />
          Keep the job.
        </h1>

        <p className={styles.intro}>
          Plan harmless office capers, hand each one to a crew member by code
          name, and pull it off before time runs out. Every heist gets a
          deadline somewhere between {HEIST_MIN_DEADLINE_HOURS} and{" "}
          {HEIST_MAX_DEADLINE_HOURS} hours. You don&apos;t get to pick.
        </p>

        <div className={styles.actions}>
          <Link href="/signup" className={`btn ${styles.register}`}>
            Register
          </Link>
          <p className={styles.login}>
            Already on a crew? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>

      <figure className={styles.example}>
        <article className={styles.ticket} aria-label="Example heist">
          <h2 className={styles.ticketTitle}>The last glazed donut</h2>
          <p className={styles.ticketBody}>
            Lift it from the break room before the 10am stand-up ends. Put the
            empty box back exactly where you found it.
          </p>
          <dl className={styles.facts}>
            <div>
              <dt>Planned by</dt>
              <dd>Silent Falcon</dd>
            </div>
            <div>
              <dt>Assigned to</dt>
              <dd>Velvet Otter</dd>
            </div>
          </dl>
          <div className={styles.timeLeft}>
            <span>Time left</span>
            <Countdown seconds={EXAMPLE_SECONDS_LEFT} className={styles.digits} />
          </div>
        </article>
        <figcaption className={styles.caption}>
          A heist, as your crew sees it.
        </figcaption>
      </figure>
    </div>
  )
}
