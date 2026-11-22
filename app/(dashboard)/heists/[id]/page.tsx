import type { Metadata } from "next"
import HeistDetailsLoader from "@/components/HeistDetailsLoader"

export const metadata: Metadata = {
  title: "Heist details",
}

export default async function HeistDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="page-content">
      <HeistDetailsLoader heistId={id} />
    </div>
  )
}
