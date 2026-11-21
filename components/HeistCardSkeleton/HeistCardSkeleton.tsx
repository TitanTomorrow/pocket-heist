import styles from "./HeistCardSkeleton.module.css"

interface HeistCardSkeletonProps {
  count?: number
}

// Card-shaped placeholders in the heist grid. Purely visual: the page
// announces loading once in its own status region, rather than once per list
export default function HeistCardSkeleton({ count = 1 }: HeistCardSkeletonProps) {
  return (
    <div className="heist-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.card} data-testid="heist-card-skeleton">
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
    </div>
  )
}
