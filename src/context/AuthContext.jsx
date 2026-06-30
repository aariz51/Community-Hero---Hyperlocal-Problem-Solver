import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function ensureProfile(u, overrides = {}) {
    const ref = doc(db, 'users', u.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      const fresh = {
        name: overrides.name || u.displayName || (u.email ? u.email.split('@')[0] : 'Citizen'),
        email: u.email || '',
        photoURL: u.photoURL || '',
        points: 0,
        badges: [],
        reportCount: 0,
      }
      await setDoc(ref, fresh)
      setProfile(fresh)
      return fresh
    }
    setProfile(snap.data())
    return snap.data()
  }

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await ensureProfile(u)
      } else setProfile(null)
      setLoading(false)
    })
  }, [])

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider)
  const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const createEmailAccount = async ({ name, email, password }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    if (name) await updateProfile(credential.user, { displayName: name })
    await ensureProfile(credential.user, { name })
    return credential
  }
  const logout = () => signOut(auth)

  return (
    <AuthCtx.Provider value={{
      user,
      profile,
      loading,
      login: loginWithGoogle,
      loginWithGoogle,
      loginWithEmail,
      createEmailAccount,
      logout,
      setProfile,
    }}>
      {children}
    </AuthCtx.Provider>
  )
}
