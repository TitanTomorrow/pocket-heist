"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Skeleton from "@/components/Skeleton"
import { useUser } from "@/components/UserProvider"

// Shows children only to signed-in users; a placeholder while auth is unknown,
// and sends signed-out users to /login. This shapes the UI only; data access
// is protected by the Firestore security rules
export default function RequireAuth({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user === null) router.replace("/login")
  }, [user, router])

  if (user === undefined || user === null) {
    return (
      <div className="page-content">
        <Skeleton />
      </div>
    )
  }

  return children
}
