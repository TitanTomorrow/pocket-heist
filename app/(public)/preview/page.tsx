// preview page for newly created UI components

// components
import Avatar from "@/components/Avatar"
import Skeleton from "@/components/Skeleton"
import AuthForm from "@/components/AuthForm"
import Countdown from "@/components/Countdown"
import CreateHeistForm from "@/components/CreateHeistForm"
import HeistList from "@/components/HeistList"
import HeistCard from "@/components/HeistCard"
import HeistCardSkeleton from "@/components/HeistCardSkeleton"
import type { Heist } from "@/types/firestore"

// Fixed sample heists for HeistCard and HeistList, so the static page renders the same every time
const HOUR = 60 * 60 * 1000
const previewNow = new Date("2026-11-19T12:00:00Z").getTime()
const sampleHeist = (id: string, title: string, hoursLeft: number, overrides: Partial<Heist> = {}): Heist => ({
  id,
  title,
  description: "Sample heist",
  createdBy: "u1",
  createdByCodename: "Velvet Otter",
  assignedTo: "u2",
  assignedCodename: "Silent Falcon",
  createdAt: new Date(previewNow - HOUR),
  deadline: new Date(previewNow + hoursLeft * HOUR),
  finalStatus: "active",
  ...overrides,
})
const openHeists = [
  sampleHeist("p1", "Swap the CEO's mug for a novelty one", 5.5),
  sampleHeist("p2", "Hide every stapler on the third floor before the quarterly review", 41.2),
]
// HeistCard: short and longest (60 character) titles, nearly due, and overdue
const cardHeists = [
  sampleHeist("c1", "Swap the CEO's mug", 5.5),
  sampleHeist("c2", "Leave a mysterious sticky note on every desk on floor three!", 41.2),
  sampleHeist("c3", "Steal the last slice of birthday cake", 0.05),
  sampleHeist("c4", "Rename the office Wi-Fi", -2),
]
const expiredHeists = [
  sampleHeist("p3", "Lift the last glazed donut", 3, { finalStatus: "success" }),
  sampleHeist("p4", "Rename the office Wi-Fi", -2, { finalStatus: "failure" }),
  sampleHeist("p5", "Rickroll the all-hands slideshow", -20),
]

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

      <section>
        <h3>CreateHeistForm (with AssigneeSelect)</h3>
        <p>The assignee list reads the users collection, so it only fills in when you&apos;re signed in.</p>
        <div className="preview-grid">
          <CreateHeistForm />
        </div>
      </section>

      <section>
        <h3>HeistCard</h3>
        <div className="heist-grid">
          {cardHeists.map((heist) => (
            <HeistCard key={heist.id} heist={heist} now={previewNow} />
          ))}
        </div>
      </section>

      <section>
        <h3>HeistCardSkeleton</h3>
        <HeistCardSkeleton count={3} />
      </section>

      <section>
        <h3>HeistList</h3>
        <h4>Active</h4>
        <HeistList view="active" heists={openHeists} loading={false} error={null} now={previewNow} />
        <h4>Assigned</h4>
        <HeistList view="assigned" heists={openHeists} loading={false} error={null} now={previewNow} />
        <h4>Loading</h4>
        <HeistList view="active" heists={[]} loading error={null} now={previewNow} />
        <div className="preview-grid">
          <div>
            <h4>Expired</h4>
            <HeistList view="expired" heists={expiredHeists} loading={false} error={null} now={previewNow} />
          </div>
          <div>
            <h4>Empty</h4>
            <HeistList view="active" heists={[]} loading={false} error={null} now={previewNow} />
            <HeistList view="expired" heists={[]} loading={false} error={null} now={previewNow} />
          </div>
          <div>
            <h4>Error</h4>
            <HeistList
              view="active"
              heists={[]}
              loading={false}
              error="Couldn't load these heists. Try refreshing the page."
              now={previewNow}
            />
          </div>
          <div>
            <h4>Loading (expired)</h4>
            <HeistList view="expired" heists={[]} loading error={null} now={previewNow} />
          </div>
        </div>
      </section>
    </div>
  )
}
