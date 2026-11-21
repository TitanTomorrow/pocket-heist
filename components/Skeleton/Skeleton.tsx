import styles from "./Skeleton.module.css"

export default function Skeleton() {
  return (
    <div className={styles.skeleton} role="status">
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
      <span className={styles.srOnly}>Loading...</span>
    </div>
  )
}
