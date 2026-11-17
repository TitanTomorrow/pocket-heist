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
          <h1>
            <Link href="/heists">P<Clock8 className={styles.logo} size={14} strokeWidth={2.75} />cket Heist</Link>
          </h1>
          <div>📎 Steal the stapler. 💼 Keep your job. 😎</div>
        </header>
        <ul>
          {/* Always rendered with a fixed width so nothing shifts when the user loads */}
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
