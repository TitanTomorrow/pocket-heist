"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { useAuthActions } from "@/components/UserProvider"
import styles from "./AuthForm.module.css"

type AuthMode = "login" | "signup"

interface AuthFormProps {
  mode: AuthMode
}

const MIN_PASSWORD_LENGTH = 6
const MAX_CODE_NAME_LENGTH = 30

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password",
  "auth/email-already-in-use": "An account with this email already exists",
  "auth/invalid-email": "Please enter a valid email address",
  "auth/weak-password": `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  "auth/too-many-requests": "Too many attempts. Please try again later",
  "auth/network-request-failed": "Network error. Check your connection and try again",
}

function authErrorMessage(err: unknown) {
  const code = (err as { code?: string })?.code ?? ""
  return AUTH_ERROR_MESSAGES[code] ?? "Something went wrong. Please try again"
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup"
  const router = useRouter()
  const { signUp, logIn } = useAuthActions()

  const [codeName, setCodeName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const passwordType = showPassword ? "text" : "password"

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const cleanCodeName = codeName.trim()

    if (isSignup) {
      if (!cleanCodeName) {
        setError("Please enter a code name")
        return
      }
      // Count characters, not UTF-16 units, so an emoji counts as one
      if ([...cleanCodeName].length > MAX_CODE_NAME_LENGTH) {
        setError(`Code name must be ${MAX_CODE_NAME_LENGTH} characters or fewer`)
        return
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }
    }

    const cleanEmail = email.trim().toLowerCase()
    setSubmitting(true)
    setError("")

    try {
      if (isSignup) {
        await signUp(cleanEmail, password, cleanCodeName)
      } else {
        await logIn(cleanEmail, password)
      }
      router.push("/heists")
    } catch (err) {
      setError(authErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {isSignup && (
        <div className={styles.field}>
          <label htmlFor="signup-code-name" className={styles.label}>Code name</label>
          <input
            id="signup-code-name"
            type="text"
            autoComplete="nickname"
            required
            className={styles.input}
            value={codeName}
            onChange={(e) => {
              setCodeName(e.target.value)
              setError("")
            }}
          />
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor={`${mode}-email`} className={styles.label}>Email</label>
        <input
          id={`${mode}-email`}
          type="email"
          autoComplete="email"
          required
          className={styles.input}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError("")
          }}
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
        </div>
      )}

      {error && <p role="alert" className={styles.error}>{error}</p>}

      <button type="submit" className="btn" disabled={submitting}>
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
