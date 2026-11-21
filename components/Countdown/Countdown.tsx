"use client"

import { useEffect, useEffectEvent, useState } from "react"
import styles from "./Countdown.module.css"

interface CountdownProps {
  seconds: number // time left when first shown
  className?: string
  onExpire?: () => void // called once the countdown reaches zero
}

const pad = (n: number) => String(n).padStart(2, "0")

// Ticks a remaining time down to zero, shown as HH:MM:SS
export default function Countdown({ seconds, className, onExpire }: CountdownProps) {
  const [countdown, setCountdown] = useState(() => {
    const left = Math.max(0, Math.floor(seconds))
    return { seconds, left }
  })

  if (countdown.seconds !== seconds) {
    const left = Math.max(0, Math.floor(seconds))
    setCountdown({ seconds, left })
  }

  // Always calls the latest onExpire, without restarting the timer when it changes
  const expire = useEffectEvent(() => onExpire?.())

  useEffect(() => {
    // Measured against the clock, not counted in ticks, because browsers
    // delay intervals in background tabs
    const deadline = Date.now() + Math.max(0, Math.floor(seconds)) * 1000

    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      // Same object back when nothing changed, so React skips the re-render
      setCountdown((current) => (current.left === left ? current : { ...current, left }))
      if (left === 0) expire()
      return left
    }

    if (tick() === 0) return
    const id = setInterval(() => {
      if (tick() === 0) clearInterval(id)
    }, 1000)
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
