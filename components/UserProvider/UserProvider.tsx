"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

// displayName holds the user's code name
export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
}

// undefined: Firebase hasn't reported yet, null: signed out
type UserState = AppUser | null | undefined

interface AuthActions {
  signUp: (email: string, password: string, codeName: string) => Promise<void>
  logIn: (email: string, password: string) => Promise<void>
  logOut: () => Promise<void>
}

interface UserContextValue extends AuthActions {
  user: UserState
}

const UserContext = createContext<UserContextValue | null>(null)

// Copy into a plain object: Firebase mutates its User in place (e.g. on
// updateProfile), which React can't see, so consumers wouldn't re-render
function toAppUser(user: User): AppUser {
  return { uid: user.uid, email: user.email, displayName: user.displayName }
}

export default function UserProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [user, setUser] = useState<UserState>(undefined)
  const signupPending = useRef(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      // During signup Firebase reports the new user before the code name is
      // saved; signUp publishes the user itself once it is
      if (firebaseUser && signupPending.current) return
      setUser(firebaseUser ? toAppUser(firebaseUser) : null)
    })
  }, [])

  const signUp = useCallback(async (email: string, password: string, codeName: string) => {
    signupPending.current = true
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
      try {
        await updateProfile(newUser, { displayName: codeName })
      } catch (err) {
        // Undo the signup so no account is left without a code name
        try {
          await deleteUser(newUser)
        } catch {
          await signOut(auth).catch(() => {})
        }
        throw err
      }
      setUser(toAppUser(newUser))
    } finally {
      signupPending.current = false
    }
  }, [])

  const logIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const logOut = useCallback(() => signOut(auth), [])

  const value = useMemo(
    () => ({ user, signUp, logIn, logOut }),
    [user, signUp, logIn, logOut],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

function useUserContext(hookName: string) {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error(`${hookName} must be used inside <UserProvider>`)
  }
  return context
}

// Client components only: returns undefined (unknown), null (signed out) or the user
export function useUser(): UserState {
  return useUserContext("useUser").user
}

export function useAuthActions(): AuthActions {
  const { signUp, logIn, logOut } = useUserContext("useAuthActions")
  return { signUp, logIn, logOut }
}
