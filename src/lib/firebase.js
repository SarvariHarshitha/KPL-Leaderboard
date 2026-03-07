import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth } from 'firebase/auth'

function requiredEnv(name) {
  const v = import.meta.env[name]
  if (!v) {
    throw new Error(
      `Missing ${name}. Add it to a .env file at the project root (see README).`,
    )
  }
  return v
}

// Firebase client config (public values). Use .env variables.
const firebaseConfig = {
  apiKey: requiredEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requiredEnv('VITE_FIREBASE_PROJECT_ID'),
  appId: requiredEnv('VITE_FIREBASE_APP_ID'),
  // Optional values:
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
