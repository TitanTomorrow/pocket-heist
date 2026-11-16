"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import styles from "./AuthForm.module.css"

type AuthMode = "login" | "signup"

interface AuthFormProps {
  mode: AuthMode
}

const MIN_PASSWORD_LENGTH = 6

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const passwordType = showPassword ? "text" : "password"

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (isSignup) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }
    }

    console.log({ mode, email: email.trim().toLowerCase(), password })

    if (isSignup) {
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setShowPassword(false)
      setError("")
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor={`${mode}-email`} className={styles.label}>Email</label>
        <input
          id={`${mode}-email`}
          type="email"
          autoComplete="email"
          required
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${mode}-password`} className={styles.label}>Password</label>
        <div className={styles.passwordWrap}>
          <input
            id={`${mode}-password`}
            type={passwordType}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            className={styles.input}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError("")
            }}
          />
          <button
            type="button"
            className={styles.toggle}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {isSignup && (
        <div className={styles.field}>
          <label htmlFor="signup-confirm-password" className={styles.label}>Confirm password</label>
          <input
            id="signup-confirm-password"
            type={passwordType}
            autoComplete="new-password"
            required
            className={styles.input}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setError("")
            }}
          />
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </div>
      )}

      <button type="submit" className="btn">
        {isSignup ? "Sign up" : "Log in"}
      </button>

      <p className={styles.switch}>
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <Link href={isSignup ? "/login" : "/signup"} className={styles.link}>
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </form>
  )
}
