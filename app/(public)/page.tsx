// this page should be used only as a splash page to decide where a user should be navigated to
// when logged in --> to /heists
// when not logged in --> to /login

import { Clock8 } from "lucide-react"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h1>
          P<Clock8 className="logo" strokeWidth={2.75} />cket Heist
        </h1>
        <div>Tiny missions. Big office mischief.</div>
        <p>
          Pocket Heist turns the everyday office into your playground. Plan
          sneaky little missions, recruit a crew of trusted co-conspirators,
          and pull off harmless capers before the coffee goes cold.
        </p>
        <p>
          Swipe the last donut from the break room, quietly rearrange a
          colleague&apos;s desk, or stage the ultimate sticky-note takeover.
          Each heist comes with a target, a deadline and a crew, so everyone
          knows their role when the clock starts ticking.
        </p>
        <p>
          Pull it off and you earn bragging rights. Get caught and, well,
          there&apos;s always the next heist. Log in to see what&apos;s
          planned, or start scheming your own.
        </p>
      </div>
    </div>
  )
}
