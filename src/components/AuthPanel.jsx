import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function authMessage(error) {
  const code = String(error?.code || error?.message || '')
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) return 'Invalid email or password.'
  if (code.includes('auth/user-not-found')) return 'No account exists for that email.'
  if (code.includes('auth/email-already-in-use')) return 'That email already has an account.'
  if (code.includes('auth/weak-password')) return 'Use a password with at least 6 characters.'
  if (code.includes('auth/operation-not-allowed')) return 'Email/password sign-in is not enabled for this Firebase project yet.'
  return error?.message || 'Authentication failed.'
}

export default function AuthPanel({ title = 'Sign in to CivicPulse', subtitle = 'Use the demo credentials or create your own account.' }) {
  const { loginWithGoogle, loginWithEmail, createEmailAccount } = useAuth()
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      if (mode === 'create') await createEmailAccount({ name, email, password })
      else await loginWithEmail(email, password)
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setBusy(true); setError('')
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-panel liquid-glass">
      <div className="auth-head">
        <h2>{title}</h2>
        <p className="muted">{subtitle}</p>
      </div>

      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button>
        <button type="button" className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>Create ID</button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {mode === 'create' && (
          <label>
            Name
            <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </label>
        )}
        <label>
          Email ID
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="judge@civicpulse.app" required />
        </label>
        <label>
          Password
          <input type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        </label>
        {error && <div className="alert error">{error}</div>}
        <button className="btn btn-primary block" disabled={busy} type="submit">
          {busy ? 'Working...' : mode === 'create' ? 'Create ID' : 'Sign in'}
        </button>
      </form>

      <div className="auth-divider"><span>or</span></div>
      <button className="btn btn-ghost block liquid-glass" disabled={busy} type="button" onClick={google}>Sign in with Google</button>
    </div>
  )
}
