import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Globe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export default function NavBar() {
  const { user, profile, logout } = useAuth()
  const loc = useLocation()
  const link = (to, label) => (
    <Link to={to} className={loc.pathname === to ? 'navlink active' : 'navlink'}>{label}</Link>
  )
  return (
    <header className="nav">
      <div className="nav-inner liquid-glass">
        <Link to="/" className="logo"><span className="logo-mark"><Globe /></span> CivicPulse</Link>
        <nav className="nav-links">
          {link('/map', 'Live Map')}
          {link('/dashboard', 'Authority')}
          {link('/ask', 'Ask CivicPulse')}
          {user && link('/me', 'My Reports')}
        </nav>
        <div className="nav-right">
          <Link to="/report" className="btn btn-primary btn-sm">Report</Link>
          {user ? (
            <div className="nav-user">
              {profile?.photoURL
                ? <img src={profile.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
                : <span className="avatar avatar-fallback">{(profile?.name || 'C')[0]}</span>}
              <span className="pts">{profile?.points ?? 0} pts</span>
              <button className="btn btn-ghost btn-sm liquid-glass" onClick={logout}>Sign out</button>
            </div>
          ) : (
            <Link to="/report" className="btn btn-ghost btn-sm liquid-glass">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  )
}
