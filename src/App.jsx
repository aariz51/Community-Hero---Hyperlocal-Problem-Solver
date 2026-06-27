// CivicPulse — Community Hero (Vibe2Ship). SmartCity311 aesthetic, ZERO of their branding.
// Product name "CivicPulse" is a placeholder — swap freely.

function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="logo"><span className="logo-mark">◎</span> CivicPulse</div>
        <nav className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#map">Live Map</a>
          <a href="#impact">Impact</a>
        </nav>
        <button className="btn btn-primary">Report an issue</button>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <div className="eyebrow">Community Hero · Hyperlocal Problem Solver</div>
          <h1>See it. Snap it. <span>Solve it.</span></h1>
          <p>
            Report potholes, water leaks, broken streetlights and more in seconds.
            Our AI categorizes, locates and routes each issue to the right authority —
            then tracks it to resolution, transparently.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary">📸 Report an issue</button>
            <button className="btn btn-ghost">View live map</button>
          </div>
        </div>
        <div className="hero-art">
          <div className="map">
            <span className="pin" style={{ top: '40%', left: '28%' }} />
            <span className="pin t" style={{ top: '62%', left: '64%' }} />
            <span className="pin" style={{ top: '30%', left: '72%' }} />
          </div>
          <div className="row">
            <span><b>Pothole</b> · MG Road</span>
            <span className="tag">AI: High severity</span>
          </div>
          <div className="row">
            <span><b>Streetlight</b> · Sector 12</span>
            <span className="tag">Routed → PWD</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const data = [
    ['1,240+', 'Issues reported'],
    ['78%', 'Resolved'],
    ['42', 'Neighborhoods'],
    ['3.2 days', 'Avg. resolution'],
  ]
  return (
    <section className="stats" id="impact">
      <div className="container stats-grid">
        {data.map(([n, l]) => (
          <div className="stat" key={l}><b>{n}</b><span>{l}</span></div>
        ))}
      </div>
    </section>
  )
}

function Steps() {
  const steps = [
    ['📍', 'Spot', 'Notice a civic issue in your neighborhood — a pothole, leak, or dead streetlight.'],
    ['📸', 'Snap', 'Take a photo. AI auto-detects the category, severity and exact location.'],
    ['✅', 'Solve', 'It’s routed to the right authority and tracked live until it’s fixed.'],
  ]
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">3-step resolution system</div>
          <h2>From problem to fixed — effortlessly</h2>
          <p>No forms, no phone calls, no dead ends. Just point, shoot, and let the system do the work.</p>
        </div>
        <div className="steps">
          {steps.map(([ico, t, d], i) => (
            <div className="step" key={t}>
              <div className="step-ico">{ico}</div>
              <div className="num">STEP {i + 1}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const feats = [
    ['🧠', 'AI issue categorization', 'Gemini Vision reads each photo and tags type, severity and urgency automatically.'],
    ['🗺️', 'Geo-location & mapping', 'Every report is pinned on a live map so neighbors see what’s happening nearby.'],
    ['👥', 'Community verification', 'Residents upvote and confirm reports, surfacing what matters most.'],
    ['🔁', 'Smart de-duplication', 'Duplicate reports of the same issue are merged automatically.'],
    ['📊', 'Impact dashboards', 'Authorities and citizens track resolution rates and response times.'],
    ['🔮', 'Predictive insights', 'Spot recurring hotspots before they become bigger problems.'],
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
            <div className="feature" key={t}>
              <div className="fico">{ico}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Band() {
  return (
    <section className="section" id="map">
      <div className="container">
        <div className="band">
          <h2>Be the hero your neighborhood needs</h2>
          <p>Report your first issue in under 30 seconds. No sign-up required to start.</p>
          <button className="btn btn-primary">Report an issue now</button>
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
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#map">Live map</a>
          </div>
          <div className="footer-col">
            <h4>For cities</h4>
            <a href="#">Authority dashboard</a>
            <a href="#">Analytics</a>
            <a href="#">Integrations</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Contact</a>
            <a href="#">Privacy</a>
          </div>
        </div>
        <div className="footer-bottom">© 2026 CivicPulse · Built for Vibe2Ship</div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <Stats />
      <Steps />
      <Features />
      <Band />
      <Footer />
    </>
  )
}
