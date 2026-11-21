"use client"

import { Clock8, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthActions, useUser } from "@/components/UserProvider"
import styles from "./Navbar.module.css"

export default function Navbar() {
  const user = useUser()
  const { logOut } = useAuthActions()
  const router = useRouter()

  // Accounts created before code names existed fall back to their email
  const name = user ? user.displayName || user.email : null

  async function handleLogOut() {
    try {
      await logOut()
      router.replace("/login")
    } catch {
      // Sign-out failed, so the user is still signed in: stay on this page
    }
  }

  return (
    <div className={styles.siteNav}>
      <nav>
        <header>
          {/* Not a heading: each page has its own h1. The clock stands in for
              the "o", so the link is named explicitly or it reads "Pcket Heist" */}
          <p className={styles.brand}>
            <Link href="/heists" aria-label="Pocket Heist">
              P<Clock8 className={`logo ${styles.logo}`} size={14} strokeWidth={2.75} aria-hidden="true" />cket Heist
            </Link>
          </p>
          <div>📎 Steal the stapler. 💼 Keep your job. 😎</div>
        </header>
        <ul>
          {/* Always rendered, with a fixed width from sm up, so nothing shifts when the user loads */}
          <li className={styles.userSlot}>
            {user && (
              <>
                <span className={styles.codeName} title={name ?? undefined}>{name}</span>
                <button type="button" className={styles.logoutButton} onClick={handleLogOut}>
                  Log out
                </button>
              </>
            )}
          </li>
          <li>
            <Link href="/heists/create" className={styles.createButton}>
              <Plus size={20} />
              Create Heist
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
