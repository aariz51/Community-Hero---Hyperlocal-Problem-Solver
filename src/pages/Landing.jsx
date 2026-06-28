import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useReports } from '../hooks/useReports'

const HERO_VIDEO = '/hero.mp4'
const FEAT_VIDEO = 'https://plugin-assets.open-design.ai/plugins/innovation/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8-eee511.mp4'

const STEPS = [
  ['01', 'Capture an issue', 'Residents submit photo evidence from the street, sidewalk, park, or building frontage.'],
  ['02', 'AI categorizes', 'Gemini Vision sorts potholes, leaks, lighting, waste, roadwork, and safety hazards.'],
  ['03', 'GPS locates', 'The report is anchored to a precise public map point with neighborhood context.'],
  ['04', 'Community validates', 'Neighbors add confirmation, duplicate detection, and trust signals.'],
  ['05', 'Authority receives', 'Municipal teams get clean tickets, density maps, and routing-ready evidence.'],
  ['06', 'Progress is tracked', 'Status stays public from assignment to repair and verified closure.'],
]
const FEATURES = [
  ['camera', 'Image & video reporting', 'Evidence-first submissions for road damage, leaks, waste, and lighting faults.'],
  ['ai', 'AI categorization', 'Issue type, urgency, duplicate risk, severity, and department fit — automatic.'],
  ['pin', 'Geo-location mapping', 'Reports cluster by street, ward, and recurring infrastructure corridor.'],
  ['users', 'Community trust scoring', 'Validations and confirmations raise confidence without silencing residents.'],
  ['activity', 'Real-time tracking', 'Status updates make agency handoffs legible from report to repair.'],
  ['chart', 'Impact dashboards', 'Neighborhood groups and cities see trends, bottlenecks, and improvements.'],
  ['trend', 'Predictive maintenance', 'Recurring signals flag streets likely to degrade before the next complaint.'],
  ['award', 'Civic rewards', 'Participation is recognized through points, badges, and verified action.'],
]

const ICON_PATHS = {
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" /></>,
  ai: <><path d="M12 3a4 4 0 0 0-4 4 4 4 0 0 0-1 7.9V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4.1A4 4 0 0 0 16 7a4 4 0 0 0-4-4Z" /><path d="M9 21v-2M15 21v-2M12 12v3" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  chart: <><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="13" y="7" width="3" height="10" /></>,
  trend: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
  award: <><circle cx="12" cy="8" r="6" /><path d="M15.5 12.5 17 22l-5-3-5 3 1.5-9.5" /></>,
}
function Icon({ name }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  )
}
const LIFECYCLE = [
  ['Reported', 'Evidence and location are captured from the resident.'],
  ['Verified', 'AI and community signals confirm the issue is real.'],
  ['Assigned', 'The responsible department receives a structured ticket.'],
  ['In progress', 'Residents see the work order move through repair.'],
  ['Resolved', 'Closure is visible and confirmed by the community.'],
]
const QUOTES = [
  ['"The difference is not just reporting a pothole. It is seeing who verified it, where it sits in the queue, and when it gets resolved."', 'Neighborhood association lead', 'Ward-level volunteer group'],
  ['"We can compare duplicates, severity, and location before escalating — a shared source of truth instead of screenshots in five chats."', 'Community organizer', 'Street safety coalition'],
  ['"Structured reports help teams prioritize crews and communicate back to residents with more accountability."', 'Municipal operations manager', 'Public works desk'],
]

export default function Landing() {
  const { reports } = useReports()
  const videoRef = useRef(null)
  const total = reports.length
  const resolved = reports.filter((r) => ['resolved', 'verified'].includes(r.status)).length

  // scroll reveals + cycling lifecycle
  useEffect(() => {
    const items = document.querySelectorAll('.reveal,.reveal-sm,.reveal-l,.reveal-r,.reveal-up')
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const d = parseInt(e.target.getAttribute('data-delay') || '0', 10)
          setTimeout(() => e.target.classList.add('in'), d)
          io.unobserve(e.target)
        }
      })
    }, { rootMargin: '-80px 0px', threshold: 0.1 })
    items.forEach((el) => io.observe(el))

    const statuses = [...document.querySelectorAll('.status-line .status')]
    let i = 0
    const t = setInterval(() => {
      if (!statuses.length) return
      statuses[i].classList.remove('active')
      i = (i + 1) % statuses.length
      statuses[i].classList.add('active')
    }, 1700)
    return () => { io.disconnect(); clearInterval(t) }
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (v) { v.play?.().catch(() => {}); const f = () => { v.style.opacity = '1' }; v.addEventListener('canplay', f); return () => v.removeEventListener('canplay', f) }
  }, [])

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <video ref={videoRef} id="hero-video" autoPlay muted loop playsInline preload="auto" src={HERO_VIDEO}
          onCanPlay={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.play?.().catch(() => {}) }}
          onLoadedData={(e) => { e.currentTarget.style.opacity = '1' }} />
        <div className="hero-body">
          <p className="eyebrow reveal-sm in" style={{ marginBottom: 18 }}>Community Hero · Hyperlocal Problem Solver</p>
          <h1 className="hero-h1">Report. Verify. Resolve. <em className="serif-i">Together.</em></h1>
          <p className="hero-sub">AI-powered hyperlocal reporting for potholes, water leaks, damaged streetlights, waste overflow, and every visible issue that deserves transparent resolution.</p>
          <div className="hero-actions">
            <Link to="/report" className="btn btn-primary">Report an issue</Link>
            <Link to="/map" className="btn btn-ghost liquid-glass">View live map</Link>
          </div>
          <div className="hero-art-row">
            <div className="hero-stat liquid-glass"><b>{total || '—'}</b><span>Issues reported</span></div>
            <div className="hero-stat liquid-glass"><b>{total ? `${Math.round((resolved / total) * 100)}%` : '—'}</b><span>Resolved</span></div>
            <div className="hero-stat liquid-glass"><b>AI</b><span>Powered triage</span></div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="section">
        <div className="container">
          <p className="eyebrow reveal-sm">About CivicPulse</p>
          <h2 className="serif reveal" style={{ fontSize: 'clamp(2.4rem,7vw,4.6rem)', lineHeight: 1.06, letterSpacing: '-0.02em', marginTop: 18 }}>
            A civic operating layer for <span className="serif-i" style={{ color: 'var(--m2)' }}>streets, signals, leaks, and trust</span> — built so neighbors can see what happened after they spoke up.
          </h2>
        </div>
      </section>

      {/* FEATURED VIDEO */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="reveal-up" style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', aspectRatio: '16/9' }}>
            <video muted autoPlay loop playsInline preload="auto" src={FEAT_VIDEO} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.66), transparent 55%)' }} />
            <div className="approach-card liquid-glass" style={{ position: 'absolute', left: 24, bottom: 24, maxWidth: '32rem', borderRadius: 16, padding: 24 }}>
              <p className="eyebrow" style={{ marginBottom: 10 }}>Our approach</p>
              <p style={{ color: '#fff', fontSize: '0.92rem', lineHeight: 1.6 }}>CivicPulse turns an everyday report into an accountable public record: image evidence, AI categorization, GPS context, community validation, municipal routing, and a visible status trail until resolution.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="section">
        <div className="container">
          <div className="section-head"><p className="eyebrow reveal-sm">How it works</p><h2 className="serif reveal">From field evidence to civic action.</h2></div>
          <div className="timeline-grid reveal-up">
            {STEPS.map(([n, h, p]) => (
              <article className="tstep" key={n}><span className="tstep-num">{n}</span><div><h3>{h}</h3><p>{p}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section soft">
        <div className="container">
          <div className="section-head"><p className="eyebrow reveal-sm">AI features</p><h2 className="serif reveal">Intelligence that feels civic, not opaque.</h2></div>
          <div className="feature-grid">
            {FEATURES.map(([ico, h, p], idx) => (
              <article className="feature liquid-glass reveal-up" data-delay={idx * 60} key={h}><div className="fico"><Icon name={ico} /></div><div><h3>{h}</h3><p>{p}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section className="section">
        <div className="container">
          <div className="section-head center"><p className="eyebrow reveal-sm">Community impact</p><h2 className="serif reveal">Impact that stays accountable.</h2></div>
          <div className="stats-grid reveal-up">
            <article className="stat"><div><b>{total || 0}</b><span>Issues reported</span></div></article>
            <article className="stat"><div><b>{resolved}</b><span>Resolved & verified</span></div></article>
            <article className="stat"><div><b>6</b><span>AI agent tools</span></div></article>
            <article className="stat"><div><b className="serif">Live</b><span>City outcomes</span></div></article>
          </div>
        </div>
      </section>

      {/* LIFECYCLE */}
      <section className="section">
        <div className="container">
          <div className="section-head"><p className="eyebrow reveal-sm">Transparency & accountability</p><h2 className="serif reveal">Every issue keeps its public pulse.</h2></div>
          <div className="lifecycle-card liquid-glass reveal-up">
            <div className="status-line">
              {LIFECYCLE.map(([h, p], idx) => (
                <article className={`status${idx === 0 ? ' active' : ''}`} key={h}><div className="status-dot" /><h3>{h}</h3><p>{p}</p></article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section soft">
        <div className="container">
          <div className="section-head"><p className="eyebrow reveal-sm">Testimonials</p><h2 className="serif reveal">Three civic voices. One transparent record.</h2></div>
          <div className="quote-grid">
            {QUOTES.map(([q, who, sub], idx) => (
              <figure className="quote liquid-glass reveal-up" data-delay={idx * 120} key={who}><blockquote>{q}</blockquote><figcaption>{who}<br />{sub}</figcaption></figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="cta-card liquid-glass reveal-up">
          <p className="eyebrow">Join the movement</p>
          <h2 className="serif">Make the city visible.</h2>
          <p>Report local issues, verify what neighbors see, and help transform everyday civic friction into smarter, safer, cleaner public infrastructure.</p>
          <div className="hero-actions"><Link to="/report" className="btn btn-primary">Report an issue</Link><Link to="/dashboard" className="btn btn-ghost liquid-glass">View dashboard</Link></div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-col" style={{ maxWidth: 280 }}>
            <div className="logo" style={{ marginBottom: 12 }}><span className="logo-mark">◎</span> CivicPulse</div>
            <p className="muted">Helping communities report, track and resolve local issues with AI.</p>
          </div>
          <div className="footer-col"><h4>Product</h4><Link to="/report">Report</Link><Link to="/map">Live map</Link><Link to="/ask">Ask CivicPulse</Link></div>
          <div className="footer-col"><h4>For cities</h4><Link to="/dashboard">Authority dashboard</Link></div>
        </div>
        <div className="footer-bottom">© 2026 CivicPulse · Built for Vibe2Ship</div>
      </footer>
    </>
  )
}
