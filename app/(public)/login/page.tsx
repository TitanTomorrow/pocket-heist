import type { Metadata } from "next"
import AuthForm from "@/components/AuthForm"
import AuthRedirect from "@/components/AuthRedirect"

export const metadata: Metadata = {
  title: "Log in",
}

export default function LogInPage() {
  return (
    <div className="center-content">
      <AuthRedirect signedInTo="/heists" />
      <div className="page-content">
        <h1 className="form-title">Log in to Your Account</h1>
        <AuthForm mode="login" />
      </div>
    </div>
  )
}
