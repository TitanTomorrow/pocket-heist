import styles from "./HeistCardSkeleton.module.css"

interface HeistCardSkeletonProps {
  count?: number
}

// Card-shaped placeholders in the heist grid. One status for the lot, so
// screen readers hear "Loading" once rather than once per placeholder
export default function HeistCardSkeleton({ count = 1 }: HeistCardSkeletonProps) {
  return (
    <div className="heist-grid" role="status" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.card} aria-hidden="true" data-testid="heist-card-skeleton">
          <div className={styles.title}>
            <div className={styles.titleLine} />
            <div className={styles.titleLineShort} />
          </div>
          <div className={styles.meta}>
            <div className={styles.row}>
              <div className={styles.icon} />
              <div className={styles.barMedium} />
            </div>
            <div className={styles.row}>
              <div className={styles.icon} />
              <div className={styles.barShort} />
            </div>
            <div className={styles.row}>
              <div className={styles.icon} />
              <div className={styles.barLong} />
            </div>
          </div>
        </div>
      ))}
      <span className={styles.srOnly}>Loading...</span>
    </div>
  )
}
