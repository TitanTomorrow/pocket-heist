// users/{uid}: the document ID is the user's uid. Named UserProfile so it
// doesn't clash with User from firebase/auth
export interface UserProfile {
  codeName: string
}
