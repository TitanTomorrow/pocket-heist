"use client"

import { useSyncExternalStore } from "react"

// e.g. "Dec 5, 05:00 PM" in the viewer's timezone. Newer ICU versions put a
// narrow no-break space before AM/PM; a plain space keeps it the same everywhere
const DEADLINE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
})

// Nothing to subscribe to: this only tells the server and hydration render
// (false) apart from every render after it in the browser (true)
const subscribe = () => () => {}

// The server doesn't know the viewer's timezone, so its HTML (and the
// hydration pass that must match it) leaves the text empty; the browser
// fills it in straight after
export default function LocalDeadline({ date }: { date: Date }) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false)

  return (
    <time dateTime={date.toISOString()}>
      {inBrowser && DEADLINE_FORMAT.format(date).replace(/\u202F/g, " ")}
    </time>
  )
}
