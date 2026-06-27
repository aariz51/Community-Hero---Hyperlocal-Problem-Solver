import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { user, profile, login, logout } = useAuth()
  const loc = useLocation()
  const link = (to, label) => (
    <Link to={to} className={loc.pathname === to ? 'navlink active' : 'navlink'}>{label}</Link>
  )
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="logo"><span className="logo-mark">◎</span> CivicPulse</Link>
        <nav className="nav-links">
          {link('/map', 'Live Map')}
          {link('/dashboard', 'Authority')}
          {link('/ask', 'Ask CivicPulse')}
          {user && link('/me', 'My Reports')}
        </nav>
        <div className="nav-right">
          <Link to="/report" className="btn btn-primary">📸 Report</Link>
          {user ? (
            <div className="nav-user">
              {profile?.photoURL
                ? <img src={profile.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
                : <span className="avatar avatar-fallback">{(profile?.name||'C')[0]}</span>}
              <span className="pts">{profile?.points ?? 0} pts</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
            </div>
          ) : (
            <button className="btn btn-ghost" onClick={login}>Sign in</button>
          )}
        </div>
      </div>
    </header>
  )
}
