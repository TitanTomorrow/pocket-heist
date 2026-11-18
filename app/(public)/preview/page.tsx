// preview page for newly created UI components

// components
import Avatar from "@/components/Avatar"
import Skeleton from "@/components/Skeleton"
import AuthForm from "@/components/AuthForm"
import Countdown from "@/components/Countdown"

export default function PreviewPage() {
  return (
    <div className="page-content">
      <h2>Preview</h2>

      <section>
        <h3>Avatar</h3>
        <div className="preview-row">
          <Avatar name="alice" />
          <Avatar name="JohnDoe" />
          <Avatar name="PocketHeist" />
          <Avatar name="MalloryBarkShark" />
        </div>
      </section>

      <section>
        <h3>Skeleton</h3>
        <div className="preview-grid">
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </section>

      <section>
        <h3>AuthForm</h3>
        <div className="preview-grid">
          <AuthForm mode="login" />
          <AuthForm mode="signup" />
        </div>
      </section>

      <section>
        <h3>Countdown</h3>
        <div className="preview-row">
          <Countdown seconds={41 * 3600 + 12 * 60 + 8} />
          <Countdown seconds={65} />
          <Countdown seconds={0} />
        </div>
      </section>
    </div>
  )
}
