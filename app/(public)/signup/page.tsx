import AuthForm from "@/components/AuthForm"
import AuthRedirect from "@/components/AuthRedirect"

export default function SignupPage() {
  return (
    <div className="center-content">
      <AuthRedirect signedInTo="/heists" />
      <div className="page-content">
        <h2 className="form-title">Signup for an Account</h2>
        <AuthForm mode="signup" />
      </div>
    </div>
  )
}
