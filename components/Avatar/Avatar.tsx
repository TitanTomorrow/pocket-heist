import styles from "./Avatar.module.css"

interface AvatarProps {
  name: string
}

// PascalCase: starts uppercase, letters/digits only, and has a second capital (e.g. "JohnDoe")
const PASCAL_CASE = /^[A-Z][a-z0-9]*[A-Z][A-Za-z0-9]*$/

function getInitials(name: string) {
  const trimmed = name.trim()
  if (PASCAL_CASE.test(trimmed)) {
    return trimmed.replace(/[^A-Z]/g, "").slice(0, 2)
  }
  return trimmed.charAt(0).toUpperCase()
}

export default function Avatar({ name }: AvatarProps) {
  return (
    <div role="img" aria-label={name} className={styles.avatar}>
      {getInitials(name)}
    </div>
  )
}
