import ReassignHeistForm from "@/components/ReassignHeistForm"

export default async function ReassignHeistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="center-content">
      <div className="page-content">
        <h1 className="form-title">Reassign Heist</h1>
        <ReassignHeistForm heistId={id} />
      </div>
    </div>
  )
}
