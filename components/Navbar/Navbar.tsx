import { Clock8, Plus } from "lucide-react"
import Link from "next/link"
import styles from "./Navbar.module.css"

export default function Navbar() {
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
