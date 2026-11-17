"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/UserProvider"

interface AuthRedirectProps {
  signedInTo?: string
  signedOutTo?: string
}

// Renders nothing; once auth state is known, sends the user to the matching route
export default function AuthRedirect({ signedInTo, signedOutTo }: AuthRedirectProps) {
  const user = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user === undefined) return
    const target = user === null ? signedOutTo : signedInTo
    if (target) router.replace(target)
  }, [user, signedInTo, signedOutTo, router])

  return null
}
