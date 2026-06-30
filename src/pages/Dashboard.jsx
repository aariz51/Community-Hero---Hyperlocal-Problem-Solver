import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReports } from '../hooks/useReports'
import { useAuth } from '../context/AuthContext'
import { seedDemoData } from '../lib/seed'
import { CATEGORIES, CATEGORY_META, SEVERITY_RANK, SEVERITY_COLOR, STATUS_LABEL } from '../agent/departments'

export default function Dashboard() {
  const { reports } = useReports()
  const { user } = useAuth()
  const [seeding, setSeeding] = useState(false)
  async function seed() {
    setSeeding(true)
    try {
      await seedDemoData(user)
    } finally { setSeeding(false) }
  }
  const total = reports.length
  const open = reports.filter((r) => !['resolved', 'verified'].includes(r.status))
  const resolved = reports.filter((r) => ['resolved', 'verified'].includes(r.status))
  const verified = reports.filter((r) => r.status === 'verified')

  // avg resolution time (ms) from statusHistory
  const times = resolved.map((r) => {
    const h = r.statusHistory || []
    const start = h.find((x) => x.status === 'reported')?.at
    const end = h.find((x) => ['resolved', 'verified'].includes(x.status))?.at
    return start && end ? end - start : null
  }).filter(Boolean)
  const avgDays = times.length ? (times.reduce((a, b) => a + b, 0) / times.length / 86400000).toFixed(1) : '—'

  // triage queue: open, sorted by severity then escalation risk
  const queue = [...open].sort((a, b) =>
    (SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]) || ((b.escalationRisk || 0) - (a.escalationRisk || 0)))

  // category counts
  const byCat = CATEGORIES.map((c) => ({ c, n: reports.filter((r) => r.category === c).length })).filter((x) => x.n).sort((a, b) => b.n - a.n)
  const maxCat = Math.max(1, ...byCat.map((x) => x.n))

  // predictive hotspots: neighborhood (first part of address) + category clusters
  const clusters = {}
  reports.forEach((r) => {
    const hood = (r.address || 'Unknown').split(',')[0].trim()
    const key = `${hood}|${r.category}`
    clusters[key] = clusters[key] || { hood, category: r.category, n: 0, risk: 0 }
    clusters[key].n++
    clusters[key].risk = Math.max(clusters[key].risk, r.escalationRisk || 0)
  })
  const hotspots = Object.values(clusters).filter((c) => c.n >= 2 || c.risk >= 70).sort((a, b) => (b.n + b.risk / 20) - (a.n + a.risk / 20)).slice(0, 6)

  const stat = (n, l) => (<div className="d-stat liquid-glass"><b>{n}</b><span>{l}</span></div>)

  return (
    <div className="page wide">
      <div className="map-toolbar">
        <div>
          <h2>Authority dashboard</h2>
          <p className="muted">Real-time civic operations — triage, impact and predictive hotspots.</p>
        </div>
        {user && reports.length < 3 && (
          <button className="btn btn-ghost btn-sm" disabled={seeding} onClick={seed}>
            {seeding ? 'Seeding...' : 'Seed sample data'}
          </button>
        )}
      </div>

      <div className="d-stats">
        {stat(total, 'Total reports')}
        {stat(open.length, 'Open')}
        {stat(total ? `${Math.round((resolved.length / total) * 100)}%` : '—', 'Resolution rate')}
        {stat(verified.length, 'AI-verified fixes')}
        {stat(avgDays + (avgDays === '—' ? '' : 'd'), 'Avg. resolution')}
      </div>

      <div className="d-cols">
        <div className="d-card liquid-glass">
          <h3>🚨 Triage queue <span className="muted">(by severity & risk)</span></h3>
          {queue.length === 0 && <p className="muted">No open issues 🎉</p>}
          {queue.slice(0, 8).map((r) => (
            <Link to={`/issue/${r.id}`} key={r.id} className="q-row">
              <span className="cat-dot" style={{ background: CATEGORY_META[r.category]?.color }} />
              <span className="q-cat">{CATEGORY_META[r.category]?.icon} {r.category}</span>
              <span className="sev" style={{ color: SEVERITY_COLOR[r.severity] }}>{r.severity}</span>
              <span className="q-addr">{(r.address || '').split(',')[0]}</span>
              <span className="q-status">{STATUS_LABEL[r.status]}</span>
              {r.escalationRisk >= 70 && <span className="risk-flag">🔮 {r.escalationRisk}</span>}
            </Link>
          ))}
        </div>

        <div className="d-card liquid-glass">
          <h3>📊 By category</h3>
          {byCat.map((x) => (
            <div className="bar-row" key={x.c}>
              <span className="bar-label">{CATEGORY_META[x.c]?.icon} {x.c}</span>
              <div className="bar"><div style={{ width: `${(x.n / maxCat) * 100}%`, background: CATEGORY_META[x.c]?.color }} /></div>
              <span className="bar-n">{x.n}</span>
            </div>
          ))}
          {byCat.length === 0 && <p className="muted">No data yet.</p>}

          <h3 style={{ marginTop: 22 }}>🔮 Predictive hotspots</h3>
          {hotspots.length === 0 && <p className="muted">No emerging hotspots.</p>}
          {hotspots.map((h, i) => (
            <div className="hotspot" key={i}>
              <span>{CATEGORY_META[h.category]?.icon} <b>{h.category}</b> · {h.hood}</span>
              <span className="muted">{h.n} reports{h.risk >= 70 ? ` · risk ${h.risk}` : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
