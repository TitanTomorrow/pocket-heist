"use client"

import { useEffect, useState } from "react"
import styles from "./Countdown.module.css"

interface CountdownProps {
  seconds: number // time left when first shown
  className?: string
}

const pad = (n: number) => String(n).padStart(2, "0")

// Ticks a remaining time down to zero, shown as HH:MM:SS
export default function Countdown({ seconds, className }: CountdownProps) {
  const [left, setLeft] = useState(Math.max(0, Math.floor(seconds)))

  const done = left === 0

  useEffect(() => {
    if (done) return
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [done])

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
