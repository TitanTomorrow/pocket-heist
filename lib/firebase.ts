import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Firebase web config is safe to ship to the browser: access is enforced by
// Firebase Auth and the Firestore security rules, not by keeping these secret
const firebaseConfig = {
  apiKey: "AIzaSyDtY1tv2wzPZzMijy7HVJmLdeycPlB49Nw",
  authDomain: "pocket-heist-web-7d24.firebaseapp.com",
  projectId: "pocket-heist-web-7d24",
  storageBucket: "pocket-heist-web-7d24.firebasestorage.app",
  messagingSenderId: "337852201217",
  appId: "1:337852201217:web:baf81102d698655b90c300",
}

// Reuse the existing app during hot reloads instead of initialising twice
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
