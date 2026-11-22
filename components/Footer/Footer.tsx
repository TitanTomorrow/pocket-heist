// Site-wide copyright footer.
// Keep this a Server Component (no "use client", no hooks): the year is then
// decided once on the server and never re-rendered in the browser, so the
// server and browser can't disagree on it. app/layout.tsx revalidates daily
// so the year rolls over without a redeploy.

import styles from "./Footer.module.css"

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      {/* .inner leaves room for a row of links beside or below the notice later */}
      <div className={styles.inner}>
        <p className={styles.notice}>© {year} Pocket Heist. All rights reserved.</p>
      </div>
    </footer>
  )
}
