"use client"

import HeistList from "@/components/HeistList"
import { useHeists } from "@/hooks/useHeists"

export default function HeistsPage() {
  const active = useHeists("active")
  const assigned = useHeists("assigned")
  const expired = useHeists("expired")

  return (
    <div className="page-content">
      <h1 className="sr-only">Your Heists</h1>
      <div className="active-heists">
        <h2>Your Active Heists</h2>
        <HeistList view="active" {...active} />
      </div>
      <div className="assigned-heists">
        <h2>Heists You&apos;ve Assigned</h2>
        <HeistList view="assigned" {...assigned} />
      </div>
      <div className="expired-heists">
        <h2>Your Expired Heists</h2>
        <HeistList view="expired" {...expired} />
      </div>
    </div>
  )
}
