"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import HeistDetails from "@/components/HeistDetails"
import Skeleton from "@/components/Skeleton"
import { getHeist } from "@/lib/heists"
import type { Heist } from "@/types/firestore"
import styles from "./HeistDetailsLoader.module.css"

interface HeistDetailsLoaderProps {
  heistId: string
}

type Loaded =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready", heist: Heist | null, loadedAt: number }

// Fetches one heist by id for its page and shows it, or why it can't
export default function HeistDetailsLoader({ heistId }: HeistDetailsLoaderProps) {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    getHeist(heistId)
      .then((heist) => {
        if (!cancelled) setLoaded({ status: "ready", heist, loadedAt: Date.now() })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ status: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [heistId])

  if (loaded.status === "loading") {
    return (
      <div className={styles.loading}>
        <Skeleton />
      </div>
    )
  }

  if (loaded.status === "error") {
    return (
      <Message heading="Heist details" role="alert">
        Couldn&apos;t load this heist. Check your connection and try again.
      </Message>
    )
  }

  const { heist, loadedAt } = loaded
  if (!heist) {
    return <Message heading="Heist not found">There&apos;s no heist with that id.</Message>
  }

  return (
    <>
      <HeistDetails heist={heist} now={loadedAt} />
      <BackLink />
    </>
  )
}

// Every state but loading still gets a page heading
function Message({ heading, children, role }: { heading: string, children: React.ReactNode, role?: "alert" }) {
  return (
    <div className={styles.message}>
      <h1 className={styles.heading}>{heading}</h1>
      <p role={role}>{children}</p>
      <BackLink />
    </div>
  )
}

function BackLink() {
  return (
    <p className={styles.back}>
      <Link href="/heists" className={styles.link}>Back to heists</Link>
    </p>
  )
}
