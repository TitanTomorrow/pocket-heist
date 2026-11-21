import type { Metadata } from "next"
import AuthForm from "@/components/AuthForm"
import AuthRedirect from "@/components/AuthRedirect"

export const metadata: Metadata = {
  title: "Sign up",
}

export default function SignupPage() {
  return (
    <div className="center-content">
      <AuthRedirect signedInTo="/heists" />
      <div className="page-content">
        <h1 className="form-title">Signup for an Account</h1>
        <AuthForm mode="signup" />
      </div>
    </div>
  )
}
