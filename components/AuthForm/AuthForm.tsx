"use client"

import { useRef, useState } from "react"
import { flushSync } from "react-dom"
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

type Field = "codeName" | "email" | "password" | "confirmPassword"

// In the order they appear, so focus goes to the first field to fix
const FIELD_ORDER: Field[] = ["codeName", "email", "password", "confirmPassword"]

// The message, and the fields it's about (none for e.g. a network error)
interface FormError {
  message: string
  fields: Field[]
}

const fail = (message: string, ...fields: Field[]): FormError => ({ message, fields })

const AUTH_ERRORS: Record<string, FormError> = {
  // Firebase won't say which of the two is wrong
  "auth/invalid-credential": fail("Incorrect email or password", "email", "password"),
  "auth/email-already-in-use": fail("An account with this email already exists", "email"),
  "auth/invalid-email": fail("Please enter a valid email address", "email"),
  "auth/weak-password": fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, "password"),
  "auth/too-many-requests": fail("Too many attempts. Please try again later"),
  "auth/network-request-failed": fail("Network error. Check your connection and try again"),
}

function authError(err: unknown) {
  const code = (err as { code?: string })?.code ?? ""
  return AUTH_ERRORS[code] ?? fail("Something went wrong. Please try again")
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
  const [error, setError] = useState<FormError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({})

  const passwordType = showPassword ? "text" : "password"
  const errorId = `${mode}-error`

  // Marks a field invalid and links it to the message when the error is about it
  function errorProps(field: Field) {
    const invalid = Boolean(error?.fields.includes(field))
    return { "aria-invalid": invalid, "aria-describedby": invalid ? errorId : undefined }
  }

  function showError(next: FormError) {
    // Render first so the field is already linked to the message when focused
    flushSync(() => setError(next))
    const first = FIELD_ORDER.find((field) => next.fields.includes(field))
    if (first) inputs.current[first]?.focus()
  }

  function validateSignup(cleanCodeName: string) {
    if (!cleanCodeName) return fail("Please enter a code name", "codeName")
    // Count characters, not UTF-16 units, so an emoji counts as one
    if ([...cleanCodeName].length > MAX_CODE_NAME_LENGTH) {
      return fail(`Code name must be ${MAX_CODE_NAME_LENGTH} characters or fewer`, "codeName")
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, "password")
    }
    if (password !== confirmPassword) return fail("Passwords do not match", "confirmPassword")
    return null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const cleanCodeName = codeName.trim()
    const invalid = isSignup ? validateSignup(cleanCodeName) : null
    if (invalid) {
      showError(invalid)
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    setSubmitting(true)
    setError(null)

    try {
      if (isSignup) {
        await signUp(cleanEmail, password, cleanCodeName)
      } else {
        await logIn(cleanEmail, password)
      }
      router.push("/heists")
    } catch (err) {
      setSubmitting(false)
      showError(authError(err))
    }
  }

  let buttonText = isSignup ? "Sign up" : "Log in"
  if (submitting) buttonText = isSignup ? "Signing up…" : "Logging in…"

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {isSignup && (
        <div className={styles.field}>
          <label htmlFor="signup-code-name" className={styles.label}>Code name</label>
          <input
            id="signup-code-name"
            ref={(el) => {
              inputs.current.codeName = el
            }}
            type="text"
            autoComplete="nickname"
            required
            className={styles.input}
            value={codeName}
            {...errorProps("codeName")}
            onChange={(e) => {
              setCodeName(e.target.value)
              setError(null)
            }}
          />
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor={`${mode}-email`} className={styles.label}>Email</label>
        <input
          id={`${mode}-email`}
          ref={(el) => {
            inputs.current.email = el
          }}
          type="email"
          autoComplete="email"
          required
          className={styles.input}
          value={email}
          {...errorProps("email")}
          onChange={(e) => {
            setEmail(e.target.value)
            setError(null)
          }}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${mode}-password`} className={styles.label}>Password</label>
        <div className={styles.passwordWrap}>
          <input
            id={`${mode}-password`}
            ref={(el) => {
              inputs.current.password = el
            }}
            type={passwordType}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            className={styles.input}
            value={password}
            {...errorProps("password")}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
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
            ref={(el) => {
              inputs.current.confirmPassword = el
            }}
            type={passwordType}
            autoComplete="new-password"
            required
            className={styles.input}
            value={confirmPassword}
            {...errorProps("confirmPassword")}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setError(null)
            }}
          />
        </div>
      )}

      {error && <p id={errorId} role="alert" className={styles.error}>{error.message}</p>}

      <button type="submit" className="btn" disabled={submitting}>
        {buttonText}
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
