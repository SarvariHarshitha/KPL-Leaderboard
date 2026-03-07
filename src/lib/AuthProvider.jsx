import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'
import { AuthContext } from './authContext.js'
import { syncUser } from './api.js'

function mapUser(u) {
  if (!u) return null
  return {
    uid: u.uid,
    displayName: u.displayName ?? '',
    email: u.email ?? '',
    photoURL: u.photoURL ?? '',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const mapped = mapUser(u)
      setUser(mapped)
      setLoading(false)
      // Sync user to MongoDB and get role
      if (mapped) {
        syncUser({
          firebaseUid: mapped.uid,
          displayName: mapped.displayName,
          email: mapped.email,
          photoURL: mapped.photoURL,
        })
          .then((dbUser) => {
            setUser((prev) => prev ? {
              ...prev,
              role: dbUser.role || 'user',
              nickname: dbUser.nickname || '',
            } : prev)
          })
          .catch((err) => console.error('User sync failed:', err))
      }
    })
    return () => unsub()
  }, [])

  const actions = useMemo(() => {
    return {
      loginWithGoogle: async () => {
        setError('')
        const result = await signInWithPopup(auth, googleProvider)
        setUser(mapUser(result.user))
      },
      logout: async () => {
        setError('')
        await signOut(auth)
        setUser(null)
      },
      setError,
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, error, ...actions }),
    [user, loading, error, actions],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
