"use client"

import { useEffect, useState } from "react"
import { listCrew, type CrewMember } from "@/lib/users"
import styles from "./AssigneeSelect.module.css"

interface AssigneeSelectProps {
  id: string
  value: string // the chosen member's uid, or "" for none
  onChange: (member: CrewMember | null) => void
  exclude: string[] // uids to leave out, e.g. the signed-in user
}

type Status = "loading" | "ready" | "error"

// "Assign to" picker, listing crew members by code name from the users collection.
// Code names aren't unique, and that is deliberate: two members can show up with
// the same name and the planner may pick the wrong one. It's part of the mischief,
// so don't add uids or emails to tell them apart.
export default function AssigneeSelect({ id, value, onChange, exclude }: AssigneeSelectProps) {
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [status, setStatus] = useState<Status>("loading")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    listCrew()
      .then((members) => {
        if (cancelled) return
        setCrew(members)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  function retry() {
    setStatus("loading")
    setAttempt((n) => n + 1)
  }

  const options = crew.filter((member) => !exclude.includes(member.uid))
  const ready = status === "ready" && options.length > 0

  let placeholder = "Choose a crew member"
  if (status === "loading") placeholder = "Loading crew…"
  else if (status === "error") placeholder = "Crew unavailable"
  else if (options.length === 0) placeholder = "No one else has signed up yet"

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>Assign to</label>
      <select
        id={id}
        required
        disabled={!ready}
        className={styles.select}
        value={ready ? value : ""}
        onChange={(e) => onChange(options.find((member) => member.uid === e.target.value) ?? null)}
      >
        <option value="" disabled={ready}>{placeholder}</option>
        {ready && options.map((member) => (
          <option key={member.uid} value={member.uid}>{member.codeName}</option>
        ))}
      </select>
      {status === "error" && (
        <div className={styles.errorRow}>
          <p role="alert" className={styles.error}>Couldn&apos;t load the crew.</p>
          <button type="button" className={styles.retry} onClick={retry}>Try again</button>
        </div>
      )}
    </div>
  )
}
