"use client"

import { useEffect, useRef, useState } from "react"
import styles from "./Countdown.module.css"

interface CountdownProps {
  seconds: number // time left when first shown
  className?: string
}

const pad = (n: number) => String(n).padStart(2, "0")

// Ticks a remaining time down to zero, shown as HH:MM:SS
export default function Countdown({ seconds, className }: CountdownProps) {
  const [countdown, setCountdown] = useState(() => {
    const left = Math.max(0, Math.floor(seconds))
    return { seconds, left }
  })
  const deadlineRef = useRef<number | null>(null)

  if (countdown.seconds !== seconds) {
    const left = Math.max(0, Math.floor(seconds))
    setCountdown({ seconds, left })
  }

  useEffect(() => {
    deadlineRef.current = Date.now() + Math.max(0, Math.floor(seconds)) * 1000
  }, [seconds])

  useEffect(() => {
    const update = () => {
      const deadline = deadlineRef.current
      if (deadline === null) return
      setCountdown((current) => ({
        ...current,
        left: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
      }))
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [seconds])

  const left = countdown.left
  const h = Math.floor(left / 3600)
  const m = Math.floor((left % 3600) / 60)
  const s = left % 60

  return (
    <time
      dateTime={`PT${h}H${m}M${s}S`}
      className={className ? `${styles.countdown} ${className}` : styles.countdown}
    >
      {pad(h)}:{pad(m)}:{pad(s)}
    </time>
  )
}
