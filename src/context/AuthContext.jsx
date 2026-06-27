import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const ref = doc(db, 'users', u.uid)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          const fresh = { name: u.displayName || 'Citizen', email: u.email || '', photoURL: u.photoURL || '', points: 0, badges: [], reportCount: 0 }
          await setDoc(ref, fresh)
          setProfile(fresh)
        } else setProfile(snap.data())
      } else setProfile(null)
      setLoading(false)
    })
  }, [])

  const login = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  return <AuthCtx.Provider value={{ user, profile, loading, login, logout, setProfile }}>{children}</AuthCtx.Provider>
}
