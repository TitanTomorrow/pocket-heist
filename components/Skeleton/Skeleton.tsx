import styles from "./Skeleton.module.css"

interface SkeletonProps {
  // true when something else (e.g. the page) already announces loading
  decorative?: boolean
}

export default function Skeleton({ decorative = false }: SkeletonProps) {
  return (
    <div
      className={styles.skeleton}
      role={decorative ? undefined : "status"}
      aria-hidden={decorative || undefined}
    >
      <div className={styles.header}>
        <div className={styles.avatar} />
        <div className={styles.headerLines}>
          <div className={`${styles.line} ${styles.lineFull}`} />
          <div className={`${styles.line} ${styles.lineLong}`} />
        </div>
      </div>
      <div className={styles.body}>
        <div className={`${styles.line} ${styles.lineFull}`} />
        <div className={`${styles.line} ${styles.lineFull}`} />
        <div className={`${styles.line} ${styles.lineShort}`} />
      </div>
      {!decorative && <span className={styles.srOnly}>Loading...</span>}
    </div>
  )
}
