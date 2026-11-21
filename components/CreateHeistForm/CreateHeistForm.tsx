"use client"

import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { useRouter } from "next/navigation"
import AssigneeSelect from "@/components/AssigneeSelect"
import { useUser } from "@/components/UserProvider"
import { createHeist } from "@/lib/heists"
import type { CrewMember } from "@/lib/users"
import {
  HEIST_DESCRIPTION_MAX_LENGTH,
  HEIST_MAX_DEADLINE_HOURS,
  HEIST_MIN_DEADLINE_HOURS,
  HEIST_TITLE_MAX_LENGTH,
} from "@/types/firestore"
import styles from "./CreateHeistForm.module.css"

interface FieldErrors {
  title?: string
  description?: string
}

// Count characters, not UTF-16 units, so an emoji counts as one
const length = (s: string) => [...s].length

function validate(title: string, description: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!title) errors.title = "Please enter a title"
  else if (length(title) > HEIST_TITLE_MAX_LENGTH) {
    errors.title = `Title must be ${HEIST_TITLE_MAX_LENGTH} characters or fewer`
  }
  if (!description) errors.description = "Please enter a description"
  else if (length(description) > HEIST_DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${HEIST_DESCRIPTION_MAX_LENGTH} characters or fewer`
  }
  return errors
}

export default function CreateHeistForm() {
  const user = useUser()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignee, setAssignee] = useState<CrewMember | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user || !assignee || submitting) return

    const cleanTitle = title.trim()
    const cleanDescription = description.trim()
    const errors = validate(cleanTitle, cleanDescription)
    if (errors.title || errors.description) {
      // Render the errors first so the focused field is already linked to its
      // message, and screen readers announce it along with the field
      flushSync(() => setFieldErrors(errors))
      if (errors.title) titleRef.current?.focus()
      else descriptionRef.current?.focus()
      return
    }
    setFieldErrors({})

    setSubmitting(true)
    setError("")
    try {
      await createHeist({
        title: cleanTitle,
        description: cleanDescription,
        // Accounts created before code names existed fall back to their email, as in the Navbar
        creator: { uid: user.uid, codeName: user.displayName || user.email || "" },
        assignee,
      })
      router.push("/heists")
    } catch {
      setError("Couldn't save the heist. Check your connection and try again")
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="heist-title" className={styles.label}>Title</label>
        <input
          id="heist-title"
          ref={titleRef}
          type="text"
          required
          className={styles.input}
          value={title}
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? "heist-title-error" : undefined}
          onChange={(e) => {
            setTitle(e.target.value)
            setFieldErrors((prev) => ({ ...prev, title: undefined }))
          }}
        />
        {fieldErrors.title && (
          <p id="heist-title-error" className={styles.error}>{fieldErrors.title}</p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="heist-description" className={styles.label}>Description</label>
        <textarea
          id="heist-description"
          ref={descriptionRef}
          required
          rows={4}
          className={styles.input}
          value={description}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? "heist-description-error" : undefined}
          onChange={(e) => {
            setDescription(e.target.value)
            setFieldErrors((prev) => ({ ...prev, description: undefined }))
          }}
        />
        {fieldErrors.description && (
          <p id="heist-description-error" className={styles.error}>{fieldErrors.description}</p>
        )}
      </div>

      <AssigneeSelect
        id="heist-assignee"
        value={assignee?.uid ?? ""}
        onChange={setAssignee}
        exclude={user ? [user.uid] : []}
      />

      <p className={styles.note}>
        The deadline is set at random, somewhere between {HEIST_MIN_DEADLINE_HOURS} and{" "}
        {HEIST_MAX_DEADLINE_HOURS} hours from now.
      </p>

      {error && <p role="alert" className={styles.error}>{error}</p>}

      <button type="submit" className="btn" disabled={!user || !assignee || submitting}>
        {submitting ? "Creating heist…" : "Create heist"}
      </button>
    </form>
  )
}
