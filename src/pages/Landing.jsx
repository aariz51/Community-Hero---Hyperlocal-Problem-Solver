import { Link } from 'react-router-dom'
import { useReports } from '../hooks/useReports'

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <div className="eyebrow">Community Hero · Hyperlocal Problem Solver</div>
          <h1>See it. Snap it. <span>Solve it.</span></h1>
          <p>
            Report potholes, water leaks, broken streetlights and more in seconds.
            Our AI agent categorizes, locates and routes each issue to the right authority —
            then tracks it to a verified fix, transparently.
          </p>
          <div className="hero-cta">
            <Link to="/report" className="btn btn-primary">📸 Report an issue</Link>
            <Link to="/map" className="btn btn-ghost">View live map</Link>
          </div>
        </div>
        <div className="hero-art">
          <div className="map">
            <span className="pin" style={{ top: '40%', left: '28%' }} />
            <span className="pin t" style={{ top: '62%', left: '64%' }} />
            <span className="pin" style={{ top: '30%', left: '72%' }} />
          </div>
          <div className="row"><span><b>Pothole</b> · MG Road</span><span className="tag">AI: High severity</span></div>
          <div className="row"><span><b>Streetlight</b> · Sector 12</span><span className="tag">Routed → PWD</span></div>
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const { reports } = useReports()
  const total = reports.length
  const resolved = reports.filter((r) => ['resolved', 'verified'].includes(r.status)).length
  const hoods = new Set(reports.map((r) => (r.address || '').split(',')[0])).size
  const data = [
    [total || '—', 'Issues reported'],
    [total ? `${Math.round((resolved / total) * 100)}%` : '—', 'Resolved'],
    [hoods || '—', 'Neighborhoods'],
    ['AI', 'Powered triage'],
  ]
  return (
    <section className="stats" id="impact">
      <div className="container stats-grid">
        {data.map(([n, l]) => (<div className="stat" key={l}><b>{n}</b><span>{l}</span></div>))}
      </div>
    </section>
  )
}

function Steps() {
  const steps = [
    ['📍', 'Spot', 'Notice a civic issue — a pothole, leak, or dead streetlight.'],
    ['📸', 'Snap', 'Take a photo. AI auto-detects category, severity and location.'],
    ['✅', 'Solve', 'Routed to the right authority and tracked live until verified fixed.'],
  ]
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">3-step resolution system</div>
          <h2>From problem to fixed — effortlessly</h2>
          <p>No forms, no phone calls, no dead ends. Just point, shoot, and let the agent do the work.</p>
        </div>
        <div className="steps">
          {steps.map(([ico, t, d], i) => (
            <div className="step" key={t}>
              <div className="step-ico">{ico}</div>
              <div className="num">STEP {i + 1}</div>
              <h3>{t}</h3><p>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const feats = [
    ['🧠', 'AI categorization', 'Gemini Vision reads each photo and tags type, severity and urgency.'],
    ['🗺️', 'Geo-mapping', 'Every report is pinned on a live Google Map with a hotspot heatmap.'],
    ['👥', 'Community verification', 'Residents upvote and confirm reports, surfacing what matters.'],
    ['🔁', 'Smart de-duplication', 'Duplicate reports of the same issue are merged automatically.'],
    ['📊', 'Impact dashboards', 'Authorities track resolution rates and response times in real time.'],
    ['🔮', 'Predictive insights', 'The agent flags issues likely to worsen before they escalate.'],
  ]
  return (
    <section className="section soft" id="features">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Comprehensive civic platform</div>
          <h2>Everything a community needs</h2>
          <p>Built for citizens and city officials alike — transparent, accountable, collaborative.</p>
        </div>
        <div className="features">
          {feats.map(([ico, t, d]) => (
            <div className="feature" key={t}><div className="fico">{ico}</div><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Band() {
  return (
    <section className="section" id="cta">
      <div className="container">
        <div className="band">
          <h2>Be the hero your neighborhood needs</h2>
          <p>Report your first issue in under 30 seconds.</p>
          <Link to="/report" className="btn btn-primary">Report an issue now</Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col" style={{ maxWidth: 280 }}>
            <div className="logo" style={{ marginBottom: 12 }}><span className="logo-mark">◎</span> CivicPulse</div>
            <p>Helping communities report, track and resolve local issues with AI.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/report">Report</Link><Link to="/map">Live map</Link><Link to="/ask">Ask CivicPulse</Link>
          </div>
          <div className="footer-col">
            <h4>For cities</h4>
            <Link to="/dashboard">Authority dashboard</Link>
          </div>
        </div>
        <div className="footer-bottom">© 2026 CivicPulse · Built for Vibe2Ship</div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (<><Hero /><Stats /><Steps /><Features /><Band /><Footer /></>)
}
