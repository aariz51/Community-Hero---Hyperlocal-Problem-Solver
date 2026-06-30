import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthPanel from '../components/AuthPanel'
import { useReports } from '../hooks/useReports'
import { BADGES } from '../lib/reports'
import { CATEGORY_META, STATUS_LABEL, SEVERITY_COLOR } from '../agent/departments'

export default function MyReports() {
  const { user, profile } = useAuth()
  const { reports } = useReports()
  if (!user) return (
    <div className="page narrow center">
      <AuthPanel title="My reports" subtitle="Sign in with email/password or Google to view your reports." />
    </div>
  )
  const mine = reports.filter((r) => r.userId === user.uid)
  const earned = new Set(profile?.badges || [])
  const next = BADGES.find((b) => !earned.has(b.id))

  return (
    <div className="page narrow">
      <div className="profile-head">
        {profile?.photoURL ? <img className="avatar lg" src={profile.photoURL} referrerPolicy="no-referrer" /> : <span className="avatar lg avatar-fallback">{(profile?.name||'C')[0]}</span>}
        <div>
          <h2>{profile?.name}</h2>
          <div className="pts-big">{profile?.points ?? 0} civic points · {mine.length} reports</div>
          {next && <div className="muted">Next badge: {next.label} at {next.at} pts</div>}
        </div>
      </div>

      <div className="badges">
        {BADGES.map((b) => (
          <div key={b.id} className={`badge ${earned.has(b.id) ? 'on' : ''}`}>
            <span className="badge-ico">{earned.has(b.id) ? '🏅' : '🔒'}</span>{b.label}
          </div>
        ))}
      </div>

      <h3>Your reports</h3>
      {mine.length === 0 && <p className="muted">No reports yet. <Link to="/report">File your first →</Link></p>}
      {mine.map((r) => (
        <Link to={`/issue/${r.id}`} key={r.id} className="q-row">
          {r.photoUrl && <img className="thumb" src={r.photoUrl} />}
          <span className="q-cat">{CATEGORY_META[r.category]?.icon} {r.category}</span>
          <span className="sev" style={{ color: SEVERITY_COLOR[r.severity] }}>{r.severity}</span>
          <span className="q-addr">{(r.address || '').split(',')[0]}</span>
          <span className="q-status">{STATUS_LABEL[r.status]}</span>
        </Link>
      ))}
    </div>
  )
}
