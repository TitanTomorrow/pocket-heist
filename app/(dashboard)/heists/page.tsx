"use client"

import HeistList from "@/components/HeistList"
import { useHeists } from "@/hooks/useHeists"

export default function HeistsPage() {
  const active = useHeists("active")
  const assigned = useHeists("assigned")
  const expired = useHeists("expired")
  const loading = active.loading || assigned.loading || expired.loading

  return (
    <div className="page-content">
      <h1 className="sr-only">Your Heists</h1>
      {/* One region for all three lists, kept on the page so the change to
          "loaded" is announced; the lists' own placeholders stay silent */}
      <p role="status" className="sr-only">{loading ? "Loading heists…" : "Heists loaded"}</p>
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
