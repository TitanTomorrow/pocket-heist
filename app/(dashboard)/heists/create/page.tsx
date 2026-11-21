import type { Metadata } from "next"
import CreateHeistForm from "@/components/CreateHeistForm"

export const metadata: Metadata = {
  title: "Create a heist",
}

export default function CreateHeistPage() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h1 className="form-title">Create a New Heist</h1>
        <CreateHeistForm />
      </div>
    </div>
  )
}
