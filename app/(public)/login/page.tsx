import AuthForm from "@/components/AuthForm"
import AuthRedirect from "@/components/AuthRedirect"

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
